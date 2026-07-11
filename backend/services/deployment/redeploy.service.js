const db = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const { buildQueue } = require("../../queues/build.queue");

class RedeployService {
  async redeploy(deploymentId, user) {
      console.log("SERVICE START");
  console.log("Deployment:", deploymentId);
  console.log("User:", user);
    const { rows } = await db.query(
      `
      SELECT
        d.project_id,
        p.name,
        p.repo_url,
        p.branch
      FROM deployments d
      JOIN projects p
        ON p.id = d.project_id
      WHERE d.id = $1
      `,
      [deploymentId]
    );

    if (!rows.length) {
      throw new Error("Deployment not found.");
    }

    const project = rows[0];

    const newDeploymentId = uuidv4();

    const deploymentUrl =
      `http://localhost:8000/visit/${newDeploymentId}`;

    await db.query(
      `
      INSERT INTO deployments
      (
        id,
        project_id,
        user_id,
        repo_name,
        repo_url,
        status,
        deploy_url,
        created_at,
        updated_at
      )
      VALUES
      (
        $1,$2,$3,$4,$5,
        'QUEUED',
        $6,
        NOW(),
        NOW()
      )
      `,
      [
        newDeploymentId,
        project.project_id,
        user.userId,
        project.name,
        project.repo_url,
        deploymentUrl,
      ]
    );
console.log("REDEPLOY: Adding build job");
    await buildQueue.add(
      "deployment",
      {
        deploymentId: newDeploymentId,
        cloneUrl: project.repo_url,
        githubToken: user.githubToken,
        env: {},
      }
    );
console.log("REDEPLOY: Build job added");
    return {
      success: true,
      deploymentId: newDeploymentId,
      status: "QUEUED",
    };
  }
}

module.exports = new RedeployService();