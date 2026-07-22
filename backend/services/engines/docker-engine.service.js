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
const runtimeLogService = require("../runtime/runtime-log.service");

class DockerEngine {
  async deploy({ deploymentId, workspace, buildPlan, repository, env }) {
    const lockKey = buildPlan.projectName;

    if (!deploymentLock.acquire(lockKey)) {
      throw new Error(`Project "${lockKey}" is already being deployed.`);
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
      ({ runtime, hostPort, containerName } = await this.startRuntime(
        deploymentId,
        buildPlan,
        env,
      ));

      await this.verifyHealth(deploymentId, hostPort, containerName);

      await this.switchTraffic(deploymentId, buildPlan);

      runtimeLogService.stream(containerName, deploymentId);

      await this.registerRuntime(
        deploymentId,
        buildPlan,
        runtime,
        hostPort,
        containerName,
      );

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

    await logger.success(
      deploymentId,
      "DEPLOYMENT",
      "Container started."
    );
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
        await logger.success(
          deploymentId,
          "DEPLOYMENT",
          "Health check passed."
        );
        return;
      }

      await logger.info(
        deploymentId,
        "DEPLOYMENT",
        `Waiting for application (${i}/${maxRetries})`
      );

      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    await logger.error(
      deploymentId,
      "DEPLOYMENT",
      "Health check failed."
    );
    const rollback = await rollbackEngine.rollback(deploymentId);

    if (rollback) {
      await logger.warning(
        deploymentId,
        "DEPLOYMENT",
        `Rollback → ${rollback.slot.toUpperCase()}`
      );
    } else {
      await logger.warning(
        deploymentId,
        "DEPLOYMENT",
        "No rollback target available."
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
  async switchTraffic(deploymentId, buildPlan) {
    await trafficSwitch.switch(deploymentId, buildPlan.slot);

    deploymentSlot.set(deploymentId, buildPlan.slot);

    await logger.success(
      deploymentId,
      "DEPLOYMENT",
      `Traffic switched to ${buildPlan.slot.toUpperCase()}`
    );

    await logger.success(
      deploymentId,
      "DEPLOYMENT",
      `Active slot ${buildPlan.slot.toUpperCase()}`
    );
  }
  // Finish Deployment
  async finishDeployment(deploymentId, buildPlan, hostPort) {
    await logger.milestone(
      deploymentId,
      "DEPLOYMENT_COMPLETED",
      "DEPLOYMENT",
      "Application deployed successfully."
    );

    runtimeStatus.publish(deploymentId, {
      type: "deployment",
      status: "READY",
      project: buildPlan.projectName,
      slot: buildPlan.slot,
      hostPort,
    });

    await statusService.update(deploymentId, "RUNNING");
  }
}
module.exports = new DockerEngine();
