const dockerService = require("../docker/docker.service");
const trivyService = require("../security/trivy.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");

class BuildEngine {
  async build({ deploymentId, repository, buildPlan }) {
    const started = Date.now();

    await statusService.update(deploymentId, "BUILDING");
    logger.deployment(
      deploymentId,
      `🏗 Building ${buildPlan.projectName}...`,
    );
    const exists = await dockerService.imageExists(
      buildPlan.imageName
    );
    if (exists) {
      logger.deployment(
        deploymentId,
        "🐳 Cached image found."
      );
      return;
    }
    await dockerService.buildImage({
      imageName: buildPlan.imageName,
      dockerfile: buildPlan.dockerfile,
      context: repository.repository,
      buildContext: buildPlan.buildContext,
      deploymentId,
    });

    logger.success(
      deploymentId,
      `${buildPlan.projectName} built in ${(
        (Date.now() - started) /
        1000
      ).toFixed(2)}s`,
    );
  }
  async scan({ deploymentId, buildPlan }) {
    const started = Date.now();

    logger.deployment(
      deploymentId,
      `🔍 Security scanning ${buildPlan.projectName}...`,
    );

    const report = await trivyService.scan(buildPlan.imageName);

    const critical = (report.match(/CRITICAL/g) || []).length;
    const high = (report.match(/HIGH/g) || []).length;

    logger.success(
      deploymentId,
      `${buildPlan.projectName} scan completed (${(
        (Date.now() - started) /
        1000
      ).toFixed(2)}s) HIGH=${high} CRITICAL=${critical}`,
    );
  }
}

module.exports = new BuildEngine();