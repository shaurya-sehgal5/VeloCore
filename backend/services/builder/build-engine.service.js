const dockerService = require("../docker/docker.service");
const trivyService = require("../security/scanners/trivy.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");
const metrics = require("../monitoring/metrics.service");
const {
  ensureDockerignore,
} = require("../../utils/dockerignore.util");
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
    console.log("========== BUILD DEBUG ==========");
    console.log("Repository Root :", repository.repository);
    console.log("Build Context   :", buildPlan.buildContext);
    console.log("Docker Context  :", repository.repository);
    console.log("Dockerfile      :", buildPlan.dockerfile);
    console.log("Project Exists? :", require("fs").existsSync(
      require("path").join(repository.repository, buildPlan.buildContext)
    ));
    console.log("=================================");
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

    await logger.success(
      deploymentId,
      "BUILD",
      `Docker image built (${(
        (Date.now() - started) /
        1000
      ).toFixed(2)}s)`
    );
    const duration =
      (Date.now() - started) / 1000;

    metrics.buildDuration
      .labels(buildPlan.projectName)
      .observe(duration);
  }
  async scan({ deploymentId, buildPlan }) {
    const started = Date.now();

    await logger.info(
      deploymentId,
      "SECURITY",
      `Scanning image ${buildPlan.projectName}`
    );

    const report = await trivyService.scan(buildPlan.imageName);
    const duration = (Date.now() - started) / 1000;
    const critical = (report.match(/CRITICAL/g) || []).length;
    const high = (report.match(/HIGH/g) || []).length;

    metrics.securityCritical
      .labels(buildPlan.projectName)
      .set(critical);

    metrics.securityHigh
      .labels(buildPlan.projectName)
      .set(high);
    metrics.securityHigh
      .labels(buildPlan.projectName)
      .set(high);

    await logger.success(
      deploymentId,
      "SECURITY",
      `${buildPlan.projectName} | Critical:${critical} High:${high}`
    );
  }
}

module.exports = new BuildEngine();