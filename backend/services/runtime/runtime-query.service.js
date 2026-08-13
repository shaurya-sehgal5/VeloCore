const db = require("../../config/db");
const config = require("../../config/env")

class RuntimeQueryService {
  async getByDeployment(deploymentId) {
    const { rows: deploymentRows } = await db.query(
      `
    SELECT
      d.id,
      d.project_id,
      d.status,
      p.current_deployment_id
    FROM deployments d
    JOIN projects p
      ON p.id = d.project_id
    WHERE d.id = $1
    `,
      [deploymentId]
    );

    if (!deploymentRows.length) {
      return [];
    }

    const deployment = deploymentRows[0];

    const targetDeploymentId = deploymentId;

    const { rows } = await db.query(
      `
    SELECT
      deployment_id,
      name,
      type,
      framework,
      status,
      engine,
      route,
      container_port,
      image_name,
      container_name,
      slot,
      namespace,
      deployment_name,
      service_name,
      pod,
      host,
      created_at
    FROM deployment_services
    WHERE deployment_id = $1
    ORDER BY created_at ASC
    `,
      [targetDeploymentId]
    );

    return rows.map((runtime) => ({
      ...runtime,
      url: runtime.route || null,
    }));
  }
  async latest(deploymentId) {
    const { rows: deploymentRows } = await db.query(
      `
    SELECT
      d.id,
      p.current_deployment_id
    FROM deployments d
    JOIN projects p
      ON p.id = d.project_id
    WHERE d.id = $1
    `,
      [deploymentId]
    );

    if (!deploymentRows.length) {
      return null;
    }

    const targetDeploymentId = deploymentId;

    const { rows } = await db.query(
      `
    SELECT *
    FROM deployment_services
    WHERE deployment_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
      [targetDeploymentId]
    );

    return rows[0];
  }
  async previousSuccessful(deploymentId) {
    const { rows } = await db.query(
      `
SELECT
d.id,
d.project_id
FROM deployments d
WHERE
d.project_id = (
SELECT project_id
FROM deployments
WHERE id = $1
)
AND d.status IN ('SUCCESS','RUNNING')
AND d.id<>$1
ORDER BY d.created_at DESC
LIMIT 1
`,
      [deploymentId]
    );

    return rows[0];
  }
  async all() {
    const { rows } = await db.query(
      `
        SELECT *
        FROM deployment_services
        ORDER BY created_at DESC
        `,
    );

    return rows;
  }
  async group(deploymentId) {
    const { rows: deploymentRows } = await db.query(
      `
    SELECT
      d.id,
      p.current_deployment_id
    FROM deployments d
    JOIN projects p
      ON p.id = d.project_id
    WHERE d.id = $1
    `,
      [deploymentId]
    );

    if (!deploymentRows.length) {
      return [];
    }

    const targetDeploymentId = deploymentId;

    const { rows } = await db.query(
      `
    SELECT
      id,
      name,
      type,
      framework,
      status,
      slot,
      route,
      container_port,
      image_name,
      container_name,
      created_at
    FROM deployment_services
    WHERE deployment_id = $1
    ORDER BY created_at ASC
    `,
      [targetDeploymentId]
    );

    return rows.map((runtime) => ({
      ...runtime,
      url: runtime.route || null,
    }));
  }
  async previousRuntime(deploymentId) {
    const { rows } = await db.query(
      `
SELECT *
FROM deployment_services
WHERE deployment_id = $1
ORDER BY created_at ASC
`
      ,
      [deploymentId]
    );

    return rows;
  }
}

module.exports = new RuntimeQueryService();
