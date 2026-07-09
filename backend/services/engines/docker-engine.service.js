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

class DockerEngine {
  async deploy({ deploymentId, workspace, buildPlan, repository, env }) {
    /*
    ------------------------------------
    Build Image
    ------------------------------------
    */

    await statusService.update(deploymentId, "BUILDING");

    await dockerService.buildImage({
      imageName: buildPlan.imageName,

      dockerfile: buildPlan.dockerfile,

      context: repository.repository,

      buildContext: buildPlan.buildContext,

      deploymentId,
    });

    /*
    ------------------------------------
    Start Runtime
    ------------------------------------
    */

    await statusService.update(deploymentId, "DEPLOYING");

    const hostPort = await portService.allocate();

    const containerName = buildPlan.containerName;

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

    /*
    ------------------------------------
    Give container time to boot
    ------------------------------------
    */

    await new Promise((resolve) => setTimeout(resolve, 3000));
    const healthy = await trafficHealth.verify(hostPort);

    if (!healthy) {
      throw new Error("Deployment failed health verification.");
    }

  console.log("SWITCHING:", deploymentId, buildPlan.slot);

await trafficSwitch.switch(
  deploymentId,
  buildPlan.slot
);

console.log("SWITCH COMPLETE");

    logger.deployment(
      deploymentId,
      `🚦 Traffic switched to ${buildPlan.slot.toUpperCase()}`,
    );
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
