const dockerService = require("../docker/docker.service");
const composeParser = require("../git/compose-parser.service");
const composeRuntime = require("../runtime/compose-runtime.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");

class ComposeEngine {
  async deploy({
    deploymentId,

    composeFile,

    repository,
  }) {
    await statusService.update(deploymentId, "BUILDING");

    await logger.info(
      deploymentId,
      "COMPOSE",
      "Docker Compose project detected."
    );

    const compose = composeParser.parse(composeFile);

    composeRuntime.register(deploymentId, compose);

    await logger.success(
      deploymentId,
      "COMPOSE",
      `${Object.keys(compose.services).length} service(s) detected.`
    );

    await dockerService.execute(
      "docker",

      ["compose", "-f", composeFile, "up", "-d", "--build"],

      deploymentId,
    );

    await statusService.update(deploymentId, "RUNNING");

    await logger.success(
      deploymentId,
      "COMPOSE",
      "Docker Compose deployment completed."
    );

    return {
      deploymentId,

      workspace: null,

      imageName: null,

      containerName: `compose-${deploymentId}`,

      hostPort: null,

      containerPort: null,

      compose,
    };
  }
}

module.exports = new ComposeEngine();
