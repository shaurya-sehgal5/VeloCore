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

    await Promise.all(
      jobs.map((job) =>
        buildEngine.build({
          deploymentId,
          repository,
          buildPlan: job.buildPlan,
        })
      )
    );

    logger.success(
      deploymentId,
      `Images built in ${(
        (Date.now() - buildStarted) /
        1000
      ).toFixed(1)}s`
    );

    /*
    ------------------------------------
    Phase 2 - Trivy Image Scan
    ------------------------------------
    */

    await Promise.all(
      jobs.map(async (job) => {
        logger.deployment(
          deploymentId,
          `🐳 Scanning ${job.buildPlan.projectName}...`
        );

        await trivyService.scan({
          deploymentId,
          image: job.buildPlan.imageName,
          report: securityReport,
        });
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

    logger.success(
      deploymentId,
      "🛡 Security report saved."
    );

    /*
    ------------------------------------
    Security Gate
    ------------------------------------
    */

    securityGate.validate(securityReport);

    /*
    ------------------------------------
    Phase 3 - Deploy
    ------------------------------------
    */

    const deployments = await Promise.all(
      jobs.map(async (job) => {
        const runtime = await deploymentEngine.deploy({
          engine:
            process.env.RUNTIME_ENGINE || "docker",

          graph,

          deploymentId,

          workspace,

          repository,

          buildPlan: job.buildPlan,

          env,
        });

        runtimeGroup.add(
          deploymentId,
          runtime
        );

        return {
          node: job.node,
          runtime,
        };
      })
    );

    deployments.sort((a, b) => {
      const order = {
        backend: 1,
        worker: 2,
        frontend: 3,
      };

      return (
        (order[a.runtime.type] || 99) -
        (order[b.runtime.type] || 99)
      );
    });

    return deployments;
  }
}

module.exports = new StackEngine();