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

  async build({
    deploymentId,
    repository,
    buildPlan
  }) {

    const started = Date.now();

    await statusService.update(
      deploymentId,
      "BUILDING"
    );

    await logger.milestone(
      deploymentId,
      "BUILD_STARTED",
      "BUILD",
      `Building ${buildPlan.projectName}`,
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

    const generated =
      ensureDockerignore(projectDirectory);

    if (generated) {
      await logger.info(
        deploymentId,
        "BUILD",
        "Generated default .dockerignore",
        buildPlan.projectName
      );
    }

    await logger.info(
      deploymentId,
      "BUILD",
      `Building ${buildPlan.projectName} (${buildPlan.framework})`,
      buildPlan.projectName
    );

    /*
    ==========================================
    1. BUILD IMAGE
    ==========================================
    */

    await dockerService.buildImage({
      imageName: buildPlan.imageName,

      dockerfile:
        buildPlan.dockerfile,

      context: path.join(
        repository.repository,
        buildPlan.buildContext
      ),

      buildContext:
        buildPlan.buildContext,

      deploymentId,
    });

    await logger.success(
      deploymentId,
      "BUILD",
      `Docker image built: ${buildPlan.imageName}`,
      buildPlan.projectName
    );

    /*
    ==========================================
    2. INSPECT IMAGE
    ==========================================
    */

    const inspectAfterBuild =
      await execAsync(
        `docker image inspect ${buildPlan.imageName} --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}} {{json .Config.ExposedPorts}}'`
      );

    await logger.info(
      deploymentId,
      "BUILD",
      `Image configuration verified.`,
      buildPlan.projectName
    );

    /*
    ==========================================
    3. TRIVY SECURITY SCAN
    ==========================================
    */

    const securityReport = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      findings: [],
      scanners: [],
    };

    await logger.info(
      deploymentId,
      "SECURITY",
      `Scanning ${buildPlan.imageName} with Trivy...`,
      buildPlan.projectName
    );

    await trivyService.scan({
      deploymentId,

      projectName:
        buildPlan.projectName,

      image:
        buildPlan.imageName,

      report:
        securityReport,
    });

    await logger.success(
      deploymentId,
      "SECURITY",
      `Security scan passed — Critical:${securityReport.critical} High:${securityReport.high} Medium:${securityReport.medium} Low:${securityReport.low}`,
      buildPlan.projectName
    );

    /*
    ==========================================
    5. PUSH ONLY AFTER SECURITY PASSES
    ==========================================
    */

    await logger.info(
      deploymentId,
      "REGISTRY",
      `Pushing ${buildPlan.imageName}...`,
      buildPlan.projectName
    );

    await dockerService.pushImage(
      buildPlan.imageName,
      deploymentId
    );

    await logger.success(
      deploymentId,
      "REGISTRY",
      `Image pushed successfully.`,
      buildPlan.projectName
    );

    /*
    ==========================================
    6. IMAGE METADATA
    ==========================================
    */

    const inspect =
      await execAsync(
        `docker image inspect ${buildPlan.imageName}`
      );

    const image =
      JSON.parse(inspect.stdout)[0];

    const imageSize =
      image.Size;

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

    metrics.buildDuration
      .labels(buildPlan.projectName)
      .observe(duration);

    await logger.success(
      deploymentId,
      "BUILD",
      `Build pipeline completed in ${duration.toFixed(2)}s`,
      buildPlan.projectName
    );

    await deploymentEvents.emit({
      deploymentId,
      event: "BUILD_COMPLETED",
      message:
        `${buildPlan.projectName} image built, scanned and pushed`
    });
  }
}

module.exports = new BuildEngine();