const dockerService = require("../docker.service");
const composeParser = require("../compose-parser.service");
const composeRuntime = require("../runtime/compose-runtime.service");
const logger = require("../logger.service");
const statusService = require("../status.service");

class ComposeEngine {
  async deploy({
    deploymentId,

    composeFile,

    repository,
  }) {
    await statusService.update(deploymentId, "BUILDING");

    logger.deployment(deploymentId, "📦 Docker Compose project detected.");

    const compose = composeParser.parse(composeFile);

    composeRuntime.register(deploymentId, compose);

    logger.deployment(
      deploymentId,
      `📦 ${Object.keys(compose.services).length} service(s) detected.`,
    );

    await dockerService.execute(
      "docker",

      ["compose", "-f", composeFile, "up", "-d", "--build"],

      deploymentId,
    );

    await statusService.update(deploymentId, "RUNNING");

    logger.deployment(deploymentId, "✅ Docker Compose deployment completed.");

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
