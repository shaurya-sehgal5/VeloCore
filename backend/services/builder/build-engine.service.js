const dockerService = require("../docker/docker.service");
const trivyService = require("../security/scanners/trivy.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");

class BuildEngine {
  async build({ deploymentId, repository, buildPlan }) {
    const started = Date.now();

    await statusService.update(deploymentId, "BUILDING");
    await logger.milestone(
      deploymentId,
      "BUILD_STARTED",
      "BUILD",
      `Building ${buildPlan.projectName}`
    );
    // const exists = await dockerService.imageExists(
    //   buildPlan.imageName
    // );
    // if (exists) {
    //   await logger.success(
    //     deploymentId,
    //     "BUILD",
    //     "Using cached Docker image."
    //   );
    //   return;
    // }
    await dockerService.buildImage({
      imageName: buildPlan.imageName,
      dockerfile: buildPlan.dockerfile,
      context: repository.repository,
      buildContext: buildPlan.buildContext,
      deploymentId,
    });

    await logger.success(
      deploymentId,
      "BUILD",
      `Docker image built (${(
        (Date.now() - started) /
        1000
      ).toFixed(2)}s)`
    );
  }
  async scan({ deploymentId, buildPlan }) {
    const started = Date.now();

    await logger.info(
      deploymentId,
      "SECURITY",
      `Scanning image ${buildPlan.projectName}`
    );

    const report = await trivyService.scan(buildPlan.imageName);

    const critical = (report.match(/CRITICAL/g) || []).length;
    const high = (report.match(/HIGH/g) || []).length;

    await logger.success(
      deploymentId,
      "SECURITY",
      `${buildPlan.projectName} | Critical:${critical} High:${high}`
    );
  }
}

module.exports = new BuildEngine();