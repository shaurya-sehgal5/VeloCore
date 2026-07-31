const dockerService = require("../docker/docker.service");
const trivyService = require("../security/scanners/trivy.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");
const metrics = require("../monitoring/metrics.service");
const { ensureDockerignore, } = require("../../utils/dockerignore.util");
const buildMetadata = require("../monitoring/build-metadata.service");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
const deploymentEvents = require("../deployment/deployment-event.service");

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
    await deploymentEvents.emit({
      deploymentId,
      event: "BUILD_STARTED",
      message: `Building ${buildPlan.projectName}`
    });
    const path = require("path");

    const projectDirectory = path.join(
      repository.repository,
      buildPlan.buildContext || ""
    );

    const generated = ensureDockerignore(projectDirectory);

    if (generated) {
      await logger.info(
        deploymentId,
        "BUILD",
        "Generated default .dockerignore"
      );
    }
    await dockerService.buildImage({
      imageName: buildPlan.imageName,
      dockerfile: buildPlan.dockerfile,
      context: path.join(
        repository.repository,
        buildPlan.buildContext
      ),
      buildContext: buildPlan.buildContext,
      deploymentId,
    });
    await dockerService.pushImage(
      buildPlan.imageName,
      deploymentId
    );
    const inspect = await execAsync(
      `docker image inspect ${buildPlan.imageName}`
    );

    const image = JSON.parse(inspect.stdout)[0];

    const imageSize = image.Size;

    const imageDigest =
      image.Id;

    buildMetadata.buildInfo
      .labels(
        deploymentId,
        buildPlan.framework,
        repository.branch || "main",
        repository.commit || "unknown",
        buildPlan.imageName,
        "SUCCESS"
      )
      .set(1);
    const duration =
      (Date.now() - started) / 1000;
    buildMetadata.buildImageSize
      .labels(deploymentId)
      .set(Number(imageSize));

    buildMetadata.buildDurationGauge
      .labels(deploymentId)
      .set(duration);

    await logger.success(
      deploymentId,
      "BUILD",
      `Docker image built (${(
        (Date.now() - started) /
        1000
      ).toFixed(2)}s)`
    );
    await deploymentEvents.emit({
      deploymentId,
      event: "BUILD_COMPLETED",
      message: `${buildPlan.projectName} image built`
    });
    metrics.buildDuration
      .labels(buildPlan.projectName)
      .observe(duration);
  }
}

module.exports = new BuildEngine();