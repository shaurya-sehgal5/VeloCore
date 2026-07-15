const dockerService = require("../docker/docker.service");
const trivyService = require("../security/trivy.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");

class BuildEngine {
  async build({ deploymentId, repository, buildPlan }) {
    await statusService.update(deploymentId, "BUILDING");

    logger.deployment(
      deploymentId,
      `🏗 Building ${buildPlan.projectName}...`,
    );

    await dockerService.buildImage({
      
      imageName: buildPlan.imageName,
      dockerfile: buildPlan.dockerfile,
      context: repository.repository,
      buildContext: buildPlan.buildContext,
      deploymentId,
    });
// if ((process.env.RUNTIME_ENGINE || "docker") === "kubernetes") {
//   await dockerService.loadKindImage(
//     buildPlan.imageName,
//     deploymentId,
//   );
// }
    logger.deployment(
      deploymentId,
      `✅ ${buildPlan.projectName} image built`,
    );
  }

  async scan({ deploymentId, buildPlan }) {
    logger.deployment(
      deploymentId,
      `🔍 Scanning ${buildPlan.projectName}...`,
    );

    const report = await trivyService.scan(buildPlan.imageName);

    const critical = (report.match(/CRITICAL/g) || []).length;
    const high = (report.match(/HIGH/g) || []).length;

    logger.deployment(
      deploymentId,
      `🔒 ${buildPlan.projectName} | HIGH=${high} | CRITICAL=${critical}`,
    );
  }
}

module.exports = new BuildEngine();