const dockerService = require("../docker/docker.service");
const statusService = require("../monitoring/status.service");
const portService = require("../docker/port.service");
const logger = require("../monitoring/logger.service");
const envService = require("../../config/env.service");
const runtimeRegistry = require("../runtime/runtime-registry.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const deploymentSlot = require("../deployment/deployment-slot.service");
const rollbackService = require("../traffic/rollback.service");
const trafficHealth = require("../traffic/traffic-health.service");
const trafficSwitch = require("../traffic/traffic-switch.service");
const deploymentLock = require("../deployment/deployment-lock.service");
const runtimeStatus = require("../runtime/runtime-status.service");
const rollbackEngine = require("../traffic/rollback-engine.service");

class DockerEngine {
  async deploy({ deploymentId, workspace, buildPlan, repository, env }) {
    const lockKey = buildPlan.projectName;

if (!deploymentLock.acquire(lockKey)) {
  throw new Error(
    `Project "${lockKey}" is already being deployed.`
  );
}
    /*
    ------------------------------------
    Build Image
    ------------------------------------
    */
    let runtime;
    let hostPort;
    let containerName;
    try {
      await this.buildImage(deploymentId, buildPlan, repository);
      /*
    ------------------------------------
    Start Runtime
    ------------------------------------
    */

      ({ runtime, hostPort, containerName } = await this.startRuntime(
        deploymentId,
        buildPlan,
        env,
      ));
      /*
    ------------------------------------
    Give container time to boot
    ------------------------------------
    */
      await this.verifyHealth(deploymentId, hostPort, containerName);
      await this.switchTraffic(deploymentId, buildPlan);
      await this.collectLogs(deploymentId, runtime);

      await this.registerRuntime(
        deploymentId,
        buildPlan,
        runtime,
        hostPort,
        containerName,
      );
      /*
    ------------------------------------
    Runtime Info
    ------------------------------------
    */
      await this.finishDeployment(deploymentId, buildPlan, hostPort);
    } catch (err) {
      throw err;
    } finally {
      deploymentLock.release(lockKey);
    }

    return {
      deploymentId,

      workspace,

      project: buildPlan.projectName,

      type: buildPlan.type,

      framework: buildPlan.framework,

      imageName: runtime.imageName,

      containerName,

      hostPort,

      containerPort: runtime.containerPort,
    };
  }

  async buildImage(deploymentId, buildPlan, repository) {
    await statusService.update(deploymentId, "BUILDING");

    logger.deployment(deploymentId, "🏗 Build Started");

    await dockerService.buildImage({
      imageName: buildPlan.imageName,
      dockerfile: buildPlan.dockerfile,
      context: repository.repository,
      buildContext: buildPlan.buildContext,
      deploymentId,
    });

    logger.deployment(deploymentId, "✅ Image Built");
  }

  //
  async startRuntime(deploymentId, buildPlan, env) {
    await statusService.update(deploymentId, "DEPLOYING");

    const hostPort = await portService.allocate();

    const containerName = buildPlan.containerName;

    const deploymentEnv = await envService.get(deploymentId);

const systemEnv = {
  PORT: String(buildPlan.containerPort),
  NODE_ENV: "production",
};

const runtime = await dockerService.runContainer({
  imageName: buildPlan.imageName,
  containerName,
  hostPort,
  containerPort: buildPlan.containerPort,
  buildPlan,
  env: {
    ...systemEnv,
    ...deploymentEnv,
    ...env,
  },
  deploymentId,
});

    logger.deployment(deploymentId, "🚀 Container Started");

    return {
      runtime,
      hostPort,
      containerName,
    };
  }
  //
 async verifyHealth(deploymentId, hostPort, containerName) {
  const maxRetries = 6;

  for (let i = 1; i <= maxRetries; i++) {
    const healthy = await trafficHealth.verify(hostPort);

    if (healthy) {
      logger.deployment(
        deploymentId,
        `✅ Health Check Passed (${i}/${maxRetries})`,
      );
      return;
    }

    logger.deployment(
      deploymentId,
      `⏳ Waiting for application... (${i}/${maxRetries})`,
    );

    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  logger.deployment(
    deploymentId,
    "❌ Health Check Failed",
  );

  const rollback = await rollbackEngine.rollback(deploymentId);

  if (rollback) {
    logger.deployment(
      deploymentId,
      `↩ Rolled back to ${rollback.slot.toUpperCase()}`,
    );
  } else {
    logger.deployment(
      deploymentId,
      "⚠ No previous deployment available for rollback.",
    );
  }

  await dockerService.execute(
    "docker",
    ["rm", "-f", containerName],
    deploymentId,
  );

  throw new Error("Deployment failed health verification.");
}
  //
  async registerRuntime(
    deploymentId,
    buildPlan,
    runtime,
    hostPort,
    containerName,
  ) {
    runtimeManager.register({
      deploymentId,
      project: buildPlan.projectName,
      slot: buildPlan.slot,
      type: buildPlan.type,
      framework: buildPlan.framework,
      imageName: runtime.imageName,
      containerName,
      hostPort,
      containerPort: runtime.containerPort,
    });

    await runtimeRegistry.register({
      deploymentId,
      name: buildPlan.projectName,
      type: buildPlan.type,
      framework: buildPlan.framework,
      imageName: runtime.imageName,
      containerName,
      hostPort,
      containerPort: runtime.containerPort,
      slot: buildPlan.slot,
    });

    rollbackService.save({
      deploymentId,
      slot: buildPlan.slot,
      imageName: runtime.imageName,
      containerName,
      hostPort,
    });
  }
  //
  async switchTraffic(deploymentId, buildPlan) {
    await trafficSwitch.switch(deploymentId, buildPlan.slot);

    deploymentSlot.set(deploymentId, buildPlan.slot);

    logger.deployment(
      deploymentId,
      `🚦 Traffic switched to ${buildPlan.slot.toUpperCase()}`,
    );

    logger.deployment(
      deploymentId,
      `🔄 Active Slot → ${buildPlan.slot.toUpperCase()}`,
    );
  }
  // Finish Deployment
  async finishDeployment(deploymentId, buildPlan, hostPort) {
    logger.deployment(deploymentId, "🎉 Deployment Completed");

    runtimeStatus.publish(deploymentId, {
      type: "deployment",
      status: "READY",
      project: buildPlan.projectName,
      slot: buildPlan.slot,
      hostPort,
    });

    await statusService.update(deploymentId, "RUNNING");
  }
  //
  async collectLogs(deploymentId, runtime) {
    const logs = await dockerService.execute(
      "docker",
      ["logs", runtime.containerId],
      deploymentId,
    );

    logger.deployment(deploymentId, logs);
  }
}
module.exports = new DockerEngine();
