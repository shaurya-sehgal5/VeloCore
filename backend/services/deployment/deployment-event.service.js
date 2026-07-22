const db = require("../../config/db");
const { getIO } = require("../../config/socket");

class DeploymentEventService {
  async emit({
    deploymentId,
    event,
    message,
    level = "INFO",
  }) {
    const { rows } = await db.query(
      `
      INSERT INTO deployment_events
      (
        deployment_id,
        event,
        message
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [deploymentId, event, message]
    );

    try {
      const io = getIO();

      io.to(deploymentId).emit("deployment_event", rows[0]);
    } catch (_) {}

    return rows[0];
  }

  async list(deploymentId) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM deployment_events
      WHERE deployment_id=$1
      ORDER BY created_at ASC
      `,
      [deploymentId]
    );

    return rows;
  }
}

module.exports = new DeploymentEventService();