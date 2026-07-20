const logger = require("../monitoring/logger.service");
const gitService = require("../git/git.service");
const workspaceService = require("../git/workspace.service");
const cleanupService = require("../docker/cleanup.service");
const statusService = require("../monitoring/status.service");
const metrics = require("../monitoring/metrics.service");
const { scanRepository } = require("../git/scanner.service");
const repositoryGraph = require("../graph/repository-graph.service");
const stackEngine = require("../engines/stack-engine.service");
const securityEngine = require("../security/security-engine.service");
const securityGate = require("../security/security-gate.service");

class DeploymentOrchestrator {
  async deploy({ repoUrl, githubToken, deploymentId, env = {} }) {
    let workspace = null;
    const timer = metrics.buildDuration.startTimer();
    try {
      await logger.milestone(
        deploymentId,
        "DEPLOYMENT_STARTED",
        "DEPLOYMENT",
        "Deployment started."
      );
      const started = Date.now();
      const summary = {
        buildTime: 0,
        deployTime: 0,
        totalTime: 0,
        status: "SUCCESS",
      };
      const stageTimers = {};

      const startStage = (name) => {
        stageTimers[name] = Date.now();
      };

      const endStage = async (name) => {
        await logger.success(
          deploymentId,
          name.toUpperCase(),
          `Completed in ${(
            (Date.now() - stageTimers[name]) / 1000
          ).toFixed(2)}s`
        );
      };
      metrics.deployments.inc();

      startStage("Workspace");
      workspace = await workspaceService.create();
      await endStage("Workspace");


      await logger.milestone(
        deploymentId,
        "WORKSPACE_READY",
        "WORKSPACE",
        "Workspace created."
      );


      startStage("Clone");
      await statusService.update(deploymentId, "CLONING");

      const repositoryPath = await gitService.clone(
        repoUrl,
        githubToken,
        workspace.path,
        "main",
        deploymentId,
      );
      await endStage("Clone");
      await logger.milestone(
        deploymentId,
        "REPOSITORY_CLONED",
        "WORKSPACE",
        "Repository cloned."
      );
      startStage("Repository Scan");
      await statusService.update(deploymentId, "SCANNING");

      const repository = scanRepository(repositoryPath);
      await endStage("Repository Scan");
      await logger.milestone(
        deploymentId,
        "REPOSITORY_ANALYZED",
        "ANALYSIS",
        `${repository.projects.length} project(s) detected`
      );
      startStage("Dependency Graph");
      const graph = repositoryGraph.build(repository);
      startStage("Security");

      await statusService.update(
        deploymentId,
        "SCANNING"
      );

      const securityReport = await securityEngine.run({
        deploymentId,
        workspace,
        repository,
        graph,
      });

      await endStage("Security");
      await endStage("Dependency Graph");
      await logger.success(
        deploymentId,
        "ANALYSIS",
        "Deployment graph created."
      );

      if (graph.frontend) {
        await logger.success(
          deploymentId,
          "ANALYSIS",
          `Frontend : ${graph.frontend.name}`
        );
      }

      if (graph.backend) {
        await logger.success(
          deploymentId,
          "ANALYSIS",
          `Backend : ${graph.backend.name}`
        );
      }

      await logger.success(
        deploymentId,
        "ANALYSIS",
        `Workers : ${graph.workers.length}`
      );
      startStage("Deployment");
      await stackEngine.deploy({
        graph,
        deploymentId,
        workspace,
        repository,
        env,
        securityReport,
      });
      await endStage("Deployment");
      summary.deployTime =
        (Date.now() - stageTimers.Deployment) / 1000;
      /*
            ----------------------------------
            Cleanup Workspace
            ----------------------------------
            */

      await cleanupService.success(workspace);

      await logger.milestone(
        deploymentId,
        "DEPLOYMENT_COMPLETED",
        "SUMMARY",
        "Deployment completed successfully."
      );

      metrics.runningDeployments.inc();

      timer();

      summary.totalTime =
        ((Date.now() - started) / 1000).toFixed(1);

      await logger.summary(
        deploymentId,
        `Build:${summary.buildTime}s | Deploy:${summary.deployTime}s | Total:${summary.totalTime}s | Status:${summary.status}`
      );
      return {
        success: true,

        deploymentId,

        graph,

        url: `http://localhost:8000/visit/${deploymentId}`,
      };
    } catch (error) {
      await logger.error(
        deploymentId,
        "SUMMARY",
        error.message
      );
      await logger.milestone(
        deploymentId,
        "DEPLOYMENT_FAILED",
        "SUMMARY",
        error.message
      );

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
