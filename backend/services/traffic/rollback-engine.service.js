const rollbackService = require("./rollback.service");
const dockerService = require("../docker/docker.service");
const trafficSwitch = require("./traffic-switch.service");
const logger = require("../monitoring/logger.service");
const runtimeStatus = require("../runtime/runtime-status.service");
const deploymentEvents = require("../deployment/deployment-event.service");

class RollbackEngine {
  async rollback(deploymentId) {
    const runtime = rollbackService.get(deploymentId);

    if (!runtime) {
      await logger.warning(
        deploymentId,
        "ROLLBACK",
        "No previous deployment available for rollback."
      );

      return null;
    }
    await trafficSwitch.switch(deploymentId, runtime.slot);
    await deploymentEvents.emit({
  deploymentId,
  event: "ROLLBACK_STARTED",
  message: "Rollback initiated",
});
    runtimeStatus.publish(deploymentId, {
      type: "rollback",
      slot: runtime.slot,
    });
    await logger.success(
      deploymentId,
      "ROLLBACK",
      "Rollback completed successfully."
    );
    await deploymentEvents.emit({
  deploymentId,
  event: "ROLLBACK_COMPLETED",
  message: `Rolled back to ${runtime.slot}`,
});
    await logger.info(
      deploymentId,
      "ROLLBACK",
      `Rolled back to ${runtime.slot.toUpperCase()}`
    );

    return runtime;
  }
}

module.exports = new RollbackEngine();
