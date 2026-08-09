const db = require("../config/db");
const service = require("../services/deployment/deployment-event.service");

async function resolveActiveDeployment(deploymentId) {
  const { rows } = await db.query(
    `
    SELECT
      COALESCE(
        p.current_deployment_id,
        d.id
      ) AS active_deployment_id
    FROM deployments d
    JOIN projects p
      ON p.id = d.project_id
    WHERE d.id = $1
    LIMIT 1
    `,
    [deploymentId]
  );

  return rows[0]?.active_deployment_id || deploymentId;
}

exports.list = async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const activeDeploymentId =
      await resolveActiveDeployment(deploymentId);

    const events = await service.list(
      activeDeploymentId
    );

    res.json(events);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};