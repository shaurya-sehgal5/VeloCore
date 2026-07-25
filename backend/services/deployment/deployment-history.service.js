const db = require("../../config/db");

class DeploymentHistoryService {
  async list(deploymentId) {
    const { rows } = await db.query(
      `
      SELECT
        id,
        branch,
        commit_sha,
        commit_message,
        commit_author,
        status,
        created_at
      FROM deployments
      WHERE project_id = (
        SELECT project_id
        FROM deployments
        WHERE id = $1
      )
      ORDER BY created_at DESC
      `,
      [deploymentId]
    );

    return rows;
  }
}

module.exports = new DeploymentHistoryService();