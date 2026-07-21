const db = require("../../config/db");
const { getIO } = require("../../config/socket");
const runtimeStatus = require("../runtime/runtime-status.service");
const logger = require("./logger.service");
const metrics = require("./metrics.service");

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
    switch (status) {
     case "RUNNING": {
  const { rows } = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM deployments
    WHERE status = 'RUNNING'
  `);

  metrics.runningDeployments.set(rows[0].count);
  break;
}

      case "FAILED":
        metrics.deployments.inc({
          status: "FAILED",
          runtime: process.env.RUNTIME_ENGINE || "docker",
          framework: "mixed",
        });
        break;
    }
    await logger.live(
      deploymentId,
      "STATUS",
      "INFO",
      `Status → ${status}`
    );
    try {
      runtimeStatus.publish(deploymentId, {
        type: "status",
        status,
      });
      const io = getIO();

      io.to(deploymentId).emit("status_update", {
        status,
      });
    } catch (_) { }
  }
}

module.exports = new StatusService();
