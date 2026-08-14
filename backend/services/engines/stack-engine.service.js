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
const statusService = require("../monitoring/status.service");
const runtimeRegistry = require("../runtime/runtime-registry.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const config = require("../../config/env");
const metrics = require("../monitoring/metrics.service")
const dockerService = require("../docker/docker.service");

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

    const allNodes = graph.deploymentPlan.flatMap(
      stage => stage.nodes
    );

    const backendNode = allNodes.find(
      node => node.type === "backend"
    );

    const shortId = deploymentId.substring(0, 8);

    const backendServiceName = backendNode
      ? `${backendNode.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")}-${shortId}`
      : null;

    for (const stage of graph.deploymentPlan) {
      for (const node of stage.nodes) {

        const slot = deploymentSlot.next(deploymentId);

        const buildPlan =
          builderService.createBuildPlan(
            node,
            deploymentId,
            slot
          );

        /*
        ------------------------------------
        Frontend → Backend service discovery
        ------------------------------------
        */

        if (
          node.type === "frontend" &&
          backendNode
        ) {
          buildPlan.backend = {
            enabled: true,

            serviceName:
              backendServiceName,

            servicePort:
              backendNode.containerPort || 8080,
          };
        }

        jobs.push({
          node,
          buildPlan,
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

    /*
   ------------------------------------
   Phase 2 - Trivy Image Security
   ------------------------------------
   */

    await deploymentEvents.emit({
      deploymentId,
      event: "SECURITY_SCAN_STARTED",
      message: "Container image security scan started",
    });

    await logger.info(
      deploymentId,
      "TRIVY",
      "Starting container image security scan."
    );

    if (securityReport.critical > 0) {

      await logger.error(
        deploymentId,
        "TRIVY",
        `Security gate failed — ${securityReport.critical} critical vulnerabilities found.`
      );

      throw new Error(
        `Security gate failed: ${securityReport.critical} critical vulnerabilities found`
      );
    }

    await logger.success(
      deploymentId,
      "TRIVY",
      `Security scan passed — Critical:${securityReport.critical} High:${securityReport.high} Medium:${securityReport.medium} Low:${securityReport.low}`
    );

    await deploymentEvents.emit({
      deploymentId,
      event: "SECURITY_SCAN_COMPLETED",
      message: "Container image security scan completed"
    });

    for (const job of jobs) {

      await logger.info(
        deploymentId,
        "REGISTRY",
        `Pushing ${job.buildPlan.projectName} image.`,
        job.buildPlan.projectName
      );

      await dockerService.pushImage(
        job.buildPlan.imageName,
        deploymentId
      );

      await logger.success(
        deploymentId,
        "REGISTRY",
        `${job.buildPlan.projectName} — image pushed successfully.`,
        job.buildPlan.projectName
      );
    }

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

    await securityReportService.save(
      deploymentId,
      securityReport
    );

    await deploymentEvents.emit({
      deploymentId,
      event: "SECURITY_SCAN_COMPLETED",
      message: "Security scan completed"
    });

    securityGate.validate(securityReport);

    /*
    ------------------------------------
    Phase 4 - Deploy
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
        "HELM",
        `Deploying ${job.buildPlan.projectName}`,
        job.buildPlan.projectName
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