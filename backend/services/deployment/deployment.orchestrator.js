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
const db = require("../../config/db");
const config = require("../../config/env")

class DeploymentOrchestrator {
  async deploy({
    repoUrl,
    githubToken,
    deploymentId,
    env = {},
  }) {
    let workspace = null;
    const timer = metrics.deploymentDuration.startTimer();
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
        const duration =
          (Date.now() - stageTimers[name]) / 1000;

        metrics.stageDuration
          .labels(name.toLowerCase())
          .observe(duration);

        await logger.success(
          deploymentId,
          name.toUpperCase(),
          `Completed in ${duration.toFixed(2)}s`
        );
      };
      metrics.deployments.inc({
        status: "STARTED",
        runtime: config.RUNTIME_ENGINE || "docker",
        framework: "mixed",
      });

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

      const gitResult = await gitService.clone(
        repoUrl,
        githubToken,
        workspace.path,
        "main",
        deploymentId,
      );
      await db.query(
        `
  UPDATE deployments
  SET
      branch = $1,
      commit_sha = $2,
      commit_message = $3,
      commit_author = $4,
      updated_at = NOW()
  WHERE id = $5
  `,
        [
          gitResult.branch,
          gitResult.commit,
          gitResult.commitMessage,
          gitResult.commitAuthor,
          deploymentId,
        ]
      );
      const repositoryPath = gitResult.workspace;
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
      repository.branch = gitResult.branch;
      repository.commit = gitResult.commit;
      repository.commitMessage = gitResult.commitMessage;
      repository.commitAuthor = gitResult.commitAuthor;
      repository.commitEmail = gitResult.commitEmail;
      repository.commitDate = gitResult.commitDate;
      await endStage("Repository Scan");
      await logger.milestone(
        deploymentId,
        "REPOSITORY_ANALYZED",
        "ANALYSIS",
        `${repository.projects.length} project(s) detected`
      );
      startStage("Dependency Graph");

      const graph = repositoryGraph.build(repository);

      await endStage("Dependency Graph");

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
      metrics.securityScore.labels(repository.name).set(securityReport.score || 100);

      metrics.securityCritical.labels(repository.name).set(securityReport.critical || 0);

      metrics.securityHigh.labels(repository.name).set(securityReport.high || 0);

      metrics.securityMedium.labels(repository.name).set(securityReport.medium || 0);

      metrics.securityLow.labels(repository.name).set(securityReport.low || 0);
      await endStage("Security");
      await logger.milestone(
        deploymentId,
        "SECURITY_COMPLETED",
        "SECURITY",
        "Security scan completed."
      );
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
      summary.buildTime = (Date.now() - stageTimers.Deployment) / 1000;

      await endStage("Deployment");
      await logger.milestone(
        deploymentId,
        "BUILD_COMPLETED",
        "BUILD",
        "Application build completed."
      );
      summary.deployTime =
        (Date.now() - stageTimers.Deployment) / 1000;
      /*
            ----------------------------------
            Cleanup Workspace
            ----------------------------------
            */

      try {
        await cleanupService.success(workspace);
      } catch (err) {
        await logger.warning(
          deploymentId,
          "CLEANUP",
          err.message
        );
      }

      await logger.milestone(
        deploymentId,
        "DEPLOYMENT_COMPLETED",
        "SUMMARY",
        "Deployment completed successfully."
      );

      metrics.runningDeployments.set(1);

      timer({
        status: "RUNNING",
      });
      summary.totalTime =
        ((Date.now() - started) / 1000).toFixed(1);

      await logger.summary(
        deploymentId,
        `Build:${summary.buildTime}s | Deploy:${summary.deployTime}s | Total:${summary.totalTime}s | Status:${summary.status}`
      );
      metrics.buildDuration
        .labels(repository.name)
        .observe(summary.buildTime);
      metrics.deploymentStatus.labels(
        deploymentId,
        "unknown",
        "unknown"
      ).set(0);
      metrics.deploymentUptime.labels(
        deploymentId,
        repository.name,
        `velocore-${repository.name}`
      ).set(
        Math.floor((Date.now() - started) / 1000)
      );
      metrics.runtimeCount.set(1);
      return {
        success: true,

        deploymentId,

        graph,

        url: `http://${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}`,
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
      metrics.runningDeployments.set(0);
      if (workspace) {
        await cleanupService.failed({
          workspace,

          deploymentId,
        });
      }
      metrics.deployments.inc({
        status: "FAILED",
        runtime: config.RUNTIME_ENGINE || "docker",
        framework: "mixed",
      });
      metrics.deploymentStatus.labels(
        deploymentId,
        repository.name,
        `velocore-${repository.name}`
      ).set(0);
      timer({
        status: "FAILED",
      });
      metrics.runtimeCount.set(0);
      throw error;
    }
  }
}

module.exports = new DeploymentOrchestrator();
