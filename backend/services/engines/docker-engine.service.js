const dockerService = require("../docker.service");
const registryService = require("../registry.service");
const runtimeLogService = require("../runtime-log.service");
const runtimeMonitorService = require("../runtime-monitor.service");
const healthService = require("../health.service");
const statusService = require("../status.service");
const portService = require("../port.service");
const logger = require("../logger.service");
const envService = require("../env.service");

class DockerEngine {
  async deploy({
    deploymentId,

    workspace,

    buildPlan,

    repository,

    env,
  }) {
    await statusService.update(deploymentId, "BUILDING");

    await dockerService.buildImage({
      imageName: buildPlan.imageName,

      dockerfile: buildPlan.dockerfile,

      context: repository.repository,

      buildContext: buildPlan.buildContext,

      deploymentId,
    });

    await statusService.update(deploymentId, "DEPLOYING");

    const hostPort = await portService.allocate();

    const containerName = `runtime-${deploymentId}`;

    const deploymentEnv = await envService.get(deploymentId);

    const runtime = await dockerService.runContainer({
      imageName: buildPlan.imageName,
      containerName,
      hostPort,
      containerPort: buildPlan.containerPort,
      buildPlan,
      env: {
        ...deploymentEnv,

        ...env,
      },
      deploymentId,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const logs = await dockerService.execute(
      "docker",
      ["logs", runtime.containerId],
      deploymentId,
    );

    logger.deployment(deploymentId, logs);

    await healthService.waitUntilHealthy({
      hostPort,

      deploymentId,
    });

    await registryService.register({
      deploymentId,

      imageName: runtime.imageName,

      containerName,

      hostPort,

      containerPort: runtime.containerPort,
    });

    runtimeLogService.stream(
      containerName,

      deploymentId,
    );

    runtimeMonitorService.monitor({
      deploymentId,

      containerName,

      imageName: runtime.imageName,

      workspace,
    });

    await statusService.update(
      deploymentId,

      "RUNNING",
    );

    return {
      hostPort,

      containerName,

      imageName: runtime.imageName,
    };
  }
}

module.exports = new DockerEngine();
