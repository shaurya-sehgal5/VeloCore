const logger = require("../monitoring/logger.service");
const gitService = require("../git/git.service");
const workspaceService = require("../git/workspace.service");
const cleanupService = require("../docker/cleanup.service");
const statusService = require("../monitoring/status.service");
const metrics = require("../monitoring/metrics.service");
const { scanRepository } = require("../git/scanner.service");
const repositoryGraph = require("../graph/repository-graph.service");
const stackEngine = require("../engines/stack-engine.service");

class DeploymentOrchestrator {
  async deploy({ repoUrl, githubToken, deploymentId, env = {} }) {
    let workspace = null;
    const timer = metrics.buildDuration.startTimer();
    try {
      logger.deployment(deploymentId, "🚀 Starting deployment...");
      const started = Date.now();
      const stageTimers = {};

      const startStage = (name) => {
        stageTimers[name] = Date.now();
      };

      const endStage = (name) => {
        logger.success(
          deploymentId,
          `${name} completed in ${(
            (Date.now() - stageTimers[name]) / 1000
          ).toFixed(2)}s`,
        );
      };
      metrics.deployments.inc();

      startStage("Workspace");
      workspace = await workspaceService.create();
      endStage("Workspace");
      logger.deployment(deploymentId, `📁 Workspace Created : ${workspace.id}`);


      startStage("Clone");
      await statusService.update(deploymentId, "CLONING");
      logger.deployment(deploymentId, `⏱ Clone: ${Date.now() - started} ms`);
      const repositoryPath = await gitService.clone(
        repoUrl,
        githubToken,
        workspace.path,
      );
      endStage("Clone");

      startStage("Repository Scan");
      await statusService.update(deploymentId, "SCANNING");

      const repository = scanRepository(repositoryPath);
      endStage("Repository Scan");
      logger.deployment(
        deploymentId,
        `🔍 ${repository.projects.length} deployable project(s) detected`,
      );
      startStage("Dependency Graph");
      const graph = repositoryGraph.build(repository);
      endStage("Dependency Graph");
      logger.deployment(deploymentId, "📊 Deployment Graph Created");

      logger.deployment(
        deploymentId,
        `Frontend : ${graph.frontend?.name || "None"}`,
      );

      logger.deployment(
        deploymentId,
        `Backend : ${graph.backend?.name || "None"}`,
      );

      logger.deployment(deploymentId, `Workers : ${graph.workers.length}`);

      startStage("Deployment");
      await stackEngine.deploy({
        graph,

        deploymentId,

        workspace,

        repository,

        env,
      });
      endStage("Deployment");
      logger.success(
        deploymentId,
        `
================================

Clone : ${((stageTimers.Clone - stageTimers.Workspace) / 1000).toFixed(1)}s

Scan : ...

Graph : ...

Deploy : ...

================================
`
      );
      /*
            ----------------------------------
            Cleanup Workspace
            ----------------------------------
            */

      await cleanupService.success(workspace);

      logger.deployment(deploymentId, "🎉 Deployment Finished Successfully.");

      metrics.runningDeployments.inc();

      timer();

      logger.deployment(deploymentId, `🏁 Total: ${Date.now() - started} ms`);
      return {
        success: true,

        deploymentId,

        graph,

        url: `http://localhost:8000/visit/${deploymentId}`,
      };
    } catch (error) {
      logger.error(error.message);

      logger.deployment(deploymentId, `❌ ${error.message}`);

      await statusService.update(
        deploymentId,
        error.message.includes("timed out") ? "TIMEOUT" : "FAILED",
      );

      if (workspace) {
        await cleanupService.failed({
          workspace,

          deploymentId,
        });
      }
      metrics.failedDeployments.inc();

      timer();
      throw error;
    }
  }
}

module.exports = new DeploymentOrchestrator();
