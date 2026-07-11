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

    try {
      logger.deployment(deploymentId, "🚀 Starting deployment...");
      const timer = metrics.buildDuration.startTimer();

      metrics.deployments.inc();
      /*
            ----------------------------------
            Create Workspace
            ----------------------------------
            */

      workspace = await workspaceService.create();

      logger.deployment(deploymentId, `📁 Workspace Created : ${workspace.id}`);

      /*
            ----------------------------------
            Clone Repository
            ----------------------------------
            */

      await statusService.update(deploymentId, "CLONING");

      const repositoryPath = await gitService.clone(
        repoUrl,
        githubToken,
        workspace.path,
      );

      /*
            ----------------------------------
            Scan Repository
            ----------------------------------
            */

      await statusService.update(deploymentId, "SCANNING");

      const repository = scanRepository(repositoryPath);

      logger.deployment(
        deploymentId,
        `🔍 ${repository.projects.length} deployable project(s) detected`,
      );

      const graph = repositoryGraph.build(repository);

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

      /*
            ----------------------------------
            Deploy Entire Stack
            ----------------------------------
            */

      await stackEngine.deploy({
        graph,

        deploymentId,

        workspace,

        repository,

        env,
      });

      /*
            ----------------------------------
            Cleanup Workspace
            ----------------------------------
            */

      await cleanupService.success(workspace);

      logger.deployment(deploymentId, "🎉 Deployment Finished Successfully.");

      metrics.runningDeployments.inc();

      timer();
      return {
        success: true,

        deploymentId,

        graph,

        url: `http://localhost:8000/visit/${deploymentId}`,
      };
    } catch (error) {
      logger.error(error.message);

      await statusService.update(deploymentId, "FAILED");

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
