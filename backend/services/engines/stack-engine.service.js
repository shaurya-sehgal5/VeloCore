const db = require("../../config/db");
const builderService = require("../builder/builder.service");
const buildEngine = require("../builder/build-engine.service");
const deploymentEngine = require("./deployment-engine.service");
const deploymentSlot = require("../deployment/deployment-slot.service");
const runtimeGroup = require("../runtime/runtime-group.service");
const securityReportService = require("../security/security-report.service");
const trivyService = require("../security/scanners/trivy.service");
const securityGate = require("../security/security-gate.service");
const logger = require("../monitoring/logger.service");
const deploymentEvents = require("../deployment/deployment-event.service");
const statusService = require("../monitoring/status.service")
const runtimeRegistry = require("../runtime/runtime-registry.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const config = require("../../config/env")

class StackEngine {
  async deploy({
    graph,
    deploymentId,
    workspace,
    repository,
    env,
    securityReport,
  }) {
    const jobs = [];

    /*
    ------------------------------------
    Create Build Plans
    ------------------------------------
    */

    for (const stage of graph.deploymentPlan) {
      for (const node of stage.nodes) {
        const slot = deploymentSlot.next(deploymentId);

        jobs.push({
          node,
          buildPlan: builderService.createBuildPlan(
            node,
            deploymentId,
            slot
          ),
        });
      }
    }

    /*
    ------------------------------------
    Phase 1 - Build Images
    ------------------------------------
    */

    const buildStarted = Date.now();
    await deploymentEvents.emit({
      deploymentId,
      event: "BUILD_PHASE_STARTED",
      message: "Docker image build phase started"
    });
    await Promise.all(
      jobs.map((job) =>
        buildEngine.build({
          deploymentId,
          repository,
          buildPlan: job.buildPlan,
        })
      )
    );

    await logger.milestone(
      deploymentId,
      "BUILD_COMPLETED",
      "BUILD",
      `Docker image built in ${(
        (Date.now() - buildStarted) / 1000
      ).toFixed(1)}s`
    );
    await deploymentEvents.emit({
      deploymentId,
      event: "BUILD_PHASE_COMPLETED",
      message: "All Docker images built"
    });
    /*
    ------------------------------------
    Phase 2 - Trivy Image Scan
    ------------------------------------
    */

    await Promise.all(
      jobs.map(async (job) => {
        try {
          await logger.info(
            deploymentId,
            "SECURITY",
            `Scanning ${job.buildPlan.projectName}`
          );

          await deploymentEvents.emit({
            deploymentId,
            event: "SECURITY_SCAN_STARTED",
            message: "Image security scan started",
          });

          await trivyService.scan({
            deploymentId,
            image: job.buildPlan.imageName,
            report: securityReport,
          });
        } catch (err) {
          await logger.warning(
            deploymentId,
            "SECURITY",
            `Trivy skipped for ${job.buildPlan.projectName}: ${err.message}`
          );
        }
      })
    );

    /*
    ------------------------------------
    Recalculate Score
    ------------------------------------
    */

    securityReport.score = 100;

    securityReport.score -= securityReport.secrets.length * 20;
    securityReport.score -= securityReport.critical * 20;
    securityReport.score -= securityReport.high * 10;
    securityReport.score -= securityReport.medium * 5;
    securityReport.score -= securityReport.low;

    securityReport.score = Math.max(
      securityReport.score,
      0
    );

    securityReport.passed =
      securityReport.secrets.length === 0 &&
      securityReport.critical === 0;

    /*
    ------------------------------------
    Save Security Report
    ------------------------------------
    */
    await securityReportService.save(
      deploymentId,
      securityReport
    );

    await logger.success(
      deploymentId,
      "SECURITY",
      "Security report saved."
    );
    await deploymentEvents.emit({
      deploymentId,
      event: "SECURITY_SCAN_COMPLETED",
      message: "Security scan completed"
    });

    securityGate.validate(securityReport);

    /*
    ------------------------------------
    Phase 3 - Deploy
    ------------------------------------
    */
    await deploymentEvents.emit({
      deploymentId,
      event: "DEPLOYMENT_STARTED",
      message: "Deploying workloads"
    });
    const deployments = [];

    jobs.sort((a, b) => {
      const order = {
        backend: 1,
        worker: 2,
        frontend: 3,
      };

      return (
        (order[a.buildPlan.type] || 99) -
        (order[b.buildPlan.type] || 99)
      );
    });

    for (const job of jobs) {
      await logger.info(
        deploymentId,
        "DEPLOYMENT",
        `Deploying ${job.buildPlan.projectName}`
      );

      const runtime = await deploymentEngine.deploy({
        engine:
          config.RUNTIME_ENGINE || "docker",

        graph,

        deploymentId,

        workspace,

        repository,

        buildPlan: job.buildPlan,

        env,
      });

      deployments.push({
        node: job.node,
        runtime,
      });
    }
    /*
------------------------------------
Register All Runtimes
------------------------------------
*/

    for (const deployment of deployments) {
      try {
        runtimeGroup.add(
          deploymentId,
          deployment.runtime
        );

        const rt = deployment.runtime.runtime;

        runtimeManager.register(rt);

        metrics.deploymentStatus
          .labels(
            rt.deploymentId,
            rt.project,
            rt.namespace
          )
          .set(1);

        metrics.deploymentUptime
          .labels(
            rt.deploymentId,
            rt.project,
            rt.namespace
          )
          .set(0);

        metrics.runtimeCount.set(runtimeManager.list().length);

        await runtimeRegistry.register(
          deployment.runtime.runtime
        );

        await logger.success(
          deploymentId,
          "RUNTIME",
          `Registered ${deployment.runtime.runtime.project}`
        );
      } catch (err) {
        await logger.warning(
          deploymentId,
          "RUNTIME",
          `Registration skipped: ${err.message}`
        );
      }
    }
    /*
    ------------------------------------
    Deployment Completed
    ------------------------------------
    */
    await statusService.update(
      deploymentId,
      "SUCCESS"
    );

    await deploymentEvents.emit({
      deploymentId,
      event: "RUNTIME_RUNNING",
      message: "Application is now running",
    });

    return deployments;
  }
}

module.exports = new StackEngine();