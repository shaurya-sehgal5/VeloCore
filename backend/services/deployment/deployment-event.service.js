const db = require("../../config/db");

class DeploymentEventService {
  async create(deploymentId, event, message) {
    await db.query(
      `
      INSERT INTO deployment_events (
        deployment_id,
        event,
        message
      )
      VALUES ($1,$2,$3)
      `,
      [
        deploymentId,
        event,
        message,
      ]
    );
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