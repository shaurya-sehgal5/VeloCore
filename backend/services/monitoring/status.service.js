const db = require("../../config/db");
const { getIO } = require("../../config/socket");
const runtimeStatus = require("../runtime/runtime-status.service");
const logger = require("./logger.service");
class StatusService {
  async update(deploymentId, status) {
    await db.query(
      `
            UPDATE deployments
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            `,
      [status, deploymentId],
    );
    logger.deployment(deploymentId, `Status -> ${status}`);
    try {
      runtimeStatus.publish(deploymentId, {
        type: "status",
        status,
      });
      const io = getIO();

      io.to(deploymentId).emit("status_update", {
        status,
      });
    } catch (_) {}
  }
}

module.exports = new StatusService();
