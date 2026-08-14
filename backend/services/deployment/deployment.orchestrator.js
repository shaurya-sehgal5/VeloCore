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
const config = require("../../config/env");

class DeploymentOrchestrator {
  async deploy({
    repoUrl,
    githubToken,
    deploymentId,
    env = {},
  }) {
    let workspace = null;

    const timer =
      metrics.deploymentDuration.startTimer();

    try {
      const started = Date.now();

      const summary = {
        buildTime: 0,
        deployTime: 0,
        totalTime: 0,
        status: "RUNNING",
      };

      /*
      ==========================================
      DEPLOYMENT START
      ==========================================
      */

      await logger.milestone(
        deploymentId,
        "DEPLOYMENT_STARTED",
        "DEPLOYMENT",
        "Deployment started."
      );

      metrics.deployments.inc({
        status: "STARTED",
        runtime:
          config.RUNTIME_ENGINE || "docker",
        framework: "mixed",
      });

      /*
      ==========================================
      STAGE TIMER
      ==========================================
      */

      const stageTimers = {};

      const startStage = (name) => {
        stageTimers[name] = Date.now();
      };

      const endStage = async (name) => {
        if (!stageTimers[name]) {
          return 0;
        }

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

        return duration;
      };

      /*
      ==========================================
      1. WORKSPACE
      ==========================================
      */

      startStage("Workspace");

      workspace =
        await workspaceService.create();

      await endStage("Workspace");

      await logger.milestone(
        deploymentId,
        "WORKSPACE_READY",
        "WORKSPACE",
        "Workspace created."
      );

      /*
      ==========================================
      2. REPOSITORY CLONE
      ==========================================
      */

      startStage("Clone");

      await statusService.update(
        deploymentId,
        "CLONING"
      );

      const gitResult =
        await gitService.clone(
          repoUrl,
          githubToken,
          workspace.path,
          "main",
          deploymentId
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

      const repositoryPath =
        gitResult.workspace;

      await endStage("Clone");

      await logger.milestone(
        deploymentId,
        "REPOSITORY_CLONED",
        "REPOSITORY",
        "Repository cloned."
      );

      /*
      ==========================================
      3. REPOSITORY ANALYSIS
      ==========================================
      */

      startStage("Repository Scan");

      await statusService.update(
        deploymentId,
        "SCANNING"
      );

      const repository =
        scanRepository(repositoryPath);

      repository.branch =
        gitResult.branch;

      repository.commit =
        gitResult.commit;

      repository.commitMessage =
        gitResult.commitMessage;

      repository.commitAuthor =
        gitResult.commitAuthor;

      repository.commitEmail =
        gitResult.commitEmail;

      repository.commitDate =
        gitResult.commitDate;

      await endStage("Repository Scan");

      await logger.milestone(
        deploymentId,
        "REPOSITORY_ANALYZED",
        "ANALYSIS",
        `${repository.projects.length} project(s) detected`
      );

      /*
      ==========================================
      4. DEPLOYMENT GRAPH
      ==========================================
      */

      const graph =
        repositoryGraph.build(repository);

      await logger.success(
        deploymentId,
        "ANALYSIS",
        "Deployment graph created."
      );

      if (graph.frontend) {
        await logger.success(
          deploymentId,
          "ANALYSIS",
          `Frontend: ${graph.frontend.name}`
        );
      }

      if (graph.backend) {
        await logger.success(
          deploymentId,
          "ANALYSIS",
          `Backend: ${graph.backend.name}`
        );
      }

      await logger.success(
        deploymentId,
        "ANALYSIS",
        `Workers: ${graph.workers.length}`
      );

      /*
      ==========================================
      5. SECURITY
      ==========================================
      */

      startStage("Security");

      await statusService.update(
        deploymentId,
        "SCANNING"
      );

      const securityReport =
        await securityEngine.run({
          deploymentId,
          workspace,
          repository,
          graph,
        });

      metrics.securityScore
        .labels(repository.name)
        .set(
          securityReport.score || 100
        );

      metrics.securityCritical
        .labels(repository.name)
        .set(
          securityReport.critical || 0
        );

      metrics.securityHigh
        .labels(repository.name)
        .set(
          securityReport.high || 0
        );

      metrics.securityMedium
        .labels(repository.name)
        .set(
          securityReport.medium || 0
        );

      metrics.securityLow
        .labels(repository.name)
        .set(
          securityReport.low || 0
        );

      await endStage("Security");

      /*
      ==========================================
      6. DEPLOYMENT
      ==========================================
      */

      startStage("Deployment");

      const deployments =
        await stackEngine.deploy({
          graph,
          deploymentId,
          workspace,
          repository,
          env,
          securityReport,
        });

      summary.deployTime =
        await endStage("Deployment");

      /*
      ==========================================
      BUILD TIME
      ==========================================
      */

      if (stageTimers.Build) {
        summary.buildTime =
          (Date.now() -
            stageTimers.Build) /
          1000;
      }

      /*
      ==========================================
      7. CLEANUP
      ==========================================
      */

      try {
        await cleanupService.success(
          workspace
        );
      } catch (err) {
        await logger.warning(
          deploymentId,
          "CLEANUP",
          "Workspace cleanup failed."
        );
      }

      /*
      ==========================================
      8. DEPLOYMENT COMPLETED
      ==========================================
      */

      await logger.milestone(
        deploymentId,
        "DEPLOYMENT_COMPLETED",
        "SUMMARY",
        "Deployment completed successfully."
      );

      await db.query(
        `
        UPDATE projects
        SET
          current_deployment_id = $1
        WHERE id = (
          SELECT project_id
          FROM deployments
          WHERE id = $1
        )
        `,
        [deploymentId]
      );

      metrics.runningDeployments.inc();

      summary.totalTime =
        (Date.now() - started) / 1000;

      await logger.summary(
        deploymentId,
        `Build:${summary.buildTime.toFixed(1)}s | Deploy:${summary.deployTime.toFixed(1)}s | Total:${summary.totalTime.toFixed(1)}s | Status:${summary.status}`
      );

      /*
      ==========================================
      DEPLOYMENT METRICS
      ==========================================
      */

      metrics.deploymentStatus
        .labels(
          deploymentId,
          repository.name,
          `velocore-${deploymentId}`
        )
        .set(1);

      metrics.deploymentDurationLatest
        .labels(deploymentId)
        .set(summary.totalTime);

      timer({
        status: "RUNNING",
      });

      /*
      ==========================================
      DEPLOYMENT URLS
      ==========================================
      */

      const frontend =
        deployments.find(
          (d) =>
            d.runtime.runtime.type ===
            "frontend"
        );

      const backend =
        deployments.find(
          (d) =>
            d.runtime.runtime.type ===
            "backend"
        );

      const frontendUrl =
        frontend?.runtime?.url ||
        null;

      const backendUrl =
        backend?.runtime?.url ||
        null;

      await db.query(
        `
        UPDATE deployments
        SET
          deploy_url = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          frontendUrl,
          deploymentId,
        ]
      );

      return {
        success: true,
        deploymentId,
        graph,
        frontendUrl,
        backendUrl,
        deployments,
      };

    } catch (error) {

      /*
      ==========================================
      DEPLOYMENT FAILED
      ==========================================
      */

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
        error.message.includes("timed out")
          ? "TIMEOUT"
          : "FAILED"
      );

      /*
      ==========================================
      CLEANUP
      ==========================================
      */

      if (workspace) {
        try {
          await cleanupService.failed({
            workspace,
            deploymentId,
          });
        } catch (_) { }
      }

      /*
      ==========================================
      METRICS
      ==========================================
      */

      metrics.deployments.inc({
        status: "FAILED",
        runtime:
          config.RUNTIME_ENGINE ||
          "docker",
        framework: "mixed",
      });

      metrics.deploymentStatus
        .labels(
          deploymentId,
          "unknown",
          `velocore-${deploymentId}`
        )
        .set(0);

      timer({
        status: "FAILED",
      });

      throw error;
    }
  }
}

module.exports =
  new DeploymentOrchestrator();