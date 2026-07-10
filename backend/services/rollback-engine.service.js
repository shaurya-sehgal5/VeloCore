const rollbackService = require("./rollback.service");
const dockerService = require("./docker.service");
const trafficSwitch = require("./traffic-switch.service");
const logger = require("./logger.service");
const runtimeStatus = require("./runtime-status.service");

class RollbackEngine {
  async rollback(deploymentId) {
    const runtime = rollbackService.get(deploymentId);

    if (!runtime) {
      logger.deployment(
        deploymentId,
        "⚠ No previous deployment available for rollback.",
      );

      return null;
    }
    await trafficSwitch.switch(deploymentId, runtime.slot);
    runtimeStatus.publish(deploymentId, {
      type: "rollback",
      slot: runtime.slot,
    });
    logger.deployment(deploymentId, "✅ Rollback completed successfully.");
    logger.deployment(
      deploymentId,
      `↩ Rolled back to ${runtime.slot.toUpperCase()}`,
    );

    return runtime;
  }
}

module.exports = new RollbackEngine();
