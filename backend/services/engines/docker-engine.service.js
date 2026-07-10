const dockerService = require("../docker.service");
const statusService = require("../status.service");
const portService = require("../port.service");
const logger = require("../logger.service");
const envService = require("../env.service");
const runtimeRegistry = require("../runtime-registry.service");
const runtimeManager = require("../runtime-manager.service");
const deploymentSlot = require("../deployment-slot.service");
const rollbackService = require("../rollback.service");
const trafficHealth = require("../traffic-health.service");
const trafficSwitch = require("../traffic-switch.service");
const deploymentLock = require("../deployment-lock.service");
const runtimeStatus = require("../runtime-status.service");
class DockerEngine {
  async deploy({ deploymentId, workspace, buildPlan, repository, env }) {
    if (!deploymentLock.acquire(deploymentId)) {
      throw new Error("Deployment already running.");
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
      /*
    ------------------------------------
    Start Runtime
    ------------------------------------
    */

      await statusService.update(deploymentId, "DEPLOYING");

      hostPort = await portService.allocate();

      containerName = buildPlan.containerName;

      const deploymentEnv = await envService.get(deploymentId);

      runtime = await dockerService.runContainer({
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
      logger.deployment(deploymentId, "🚀 Container Started");
      /*
    ------------------------------------
    Give container time to boot
    ------------------------------------
    */
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const rollbackEngine = require("../rollback-engine.service");

      const healthy = await trafficHealth.verify(hostPort);
      logger.deployment(
        deploymentId,
        healthy ? "✅ Health Check Passed" : "❌ Health Check Failed",
      );
      if (!healthy) {
        logger.deployment(deploymentId, "❌ Health check failed");

        const rollback = await rollbackEngine.rollback(deploymentId);

        if (rollback) {
          logger.deployment(
            deploymentId,
            `↩ Rolled back to ${rollback.slot.toUpperCase()}`,
          );
        }
        await dockerService.execute(
          "docker",
          ["rm", "-f", containerName],
          deploymentId,
        );
        throw new Error("Deployment failed health verification.");
      }

      await trafficSwitch.switch(deploymentId, buildPlan.slot);

      /*
    ------------------------------------
    Startup Logs
    ------------------------------------
    */

      const logs = await dockerService.execute(
        "docker",

        ["logs", runtime.containerId],

        deploymentId,
      );

      logger.deployment(deploymentId, logs);

      /*
    ------------------------------------
    Register Runtime
    ------------------------------------
    */
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

      deploymentSlot.set(deploymentId, buildPlan.slot);
      logger.deployment(
        deploymentId,
        `🚦 Traffic switched to ${buildPlan.slot.toUpperCase()}`,
      );

      // const oldSlot = buildPlan.slot === "blue" ? "green" : "blue";

      // const oldRuntime = runtimeManager.get(
      //   deploymentId,
      //   buildPlan.projectName,
      //   oldSlot,
      // );

      // if (oldRuntime) {
      //   logger.deployment(
      //     deploymentId,
      //     `🗑 Removing old ${oldSlot.toUpperCase()} runtime`,
      //   );

      //   await dockerService.execute(
      //     "docker",
      //     ["rm", "-f", oldRuntime.containerName],
      //     deploymentId,
      //   );

      //   runtimeManager.remove(deploymentId, buildPlan.projectName, oldSlot);
      // }

      logger.deployment(
        deploymentId,
        `🔄 Active Slot → ${buildPlan.slot.toUpperCase()}`,
      );

      /*
    ------------------------------------
    Runtime Info
    ------------------------------------
    */
      logger.deployment(deploymentId, "🎉 Deployment Completed");
      runtimeStatus.publish(deploymentId, {
        type: "deployment",
        status: "READY",
        project: buildPlan.projectName,
        slot: buildPlan.slot,
        hostPort,
      });
    } catch (err) {
      deploymentLock.release(deploymentId);
      throw err;
    } finally {
      deploymentLock.release(deploymentId);
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
}
module.exports = new DockerEngine();
