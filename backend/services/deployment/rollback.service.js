const db = require("../../config/db");
const { buildQueue } = require("../../queues/build.queue");
const { v4: uuid } = require("uuid");

class RollbackService {
  async rollback(deploymentId) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM deployments
      WHERE id=$1
      `,
      [deploymentId]
    );

    if (!rows.length) {
      throw new Error("Deployment not found");
    }

    const deployment = rows[0];

    const newDeploymentId = uuid();

    await buildQueue.add("rollback", {
      deploymentId: newDeploymentId,
      sourceDeployment: deployment.id,
      rollback: true,
      cloneUrl: deployment.repo_url,
      githubToken: null,
      env: {}
    });

    return {
      deploymentId: newDeploymentId,
      rollbackOf: deployment.id
    };
  }
}

module.exports = new RollbackService();