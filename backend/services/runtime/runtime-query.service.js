const db = require("../../config/db");
const config = require("../../config/env")

class RuntimeQueryService {
  async getByDeployment(deploymentId) {

    const { rows: deploymentRows } = await db.query(
      `
    SELECT
      id,
      project_id,
      status
    FROM deployments
    WHERE id = $1
    `,
      [deploymentId]
    );

    if (!deploymentRows.length) {
      return [];
    }

    let targetDeploymentId = deploymentId;

    const deployment = deploymentRows[0];

    if (
      deployment.status === "FAILED" ||
      deployment.status === "ROLLED_BACK"
    ) {

      const { rows } = await db.query(
        `
      SELECT id
      FROM deployments
      WHERE project_id = $1
        AND status = 'SUCCESS'
      ORDER BY created_at DESC
      LIMIT 1
      `,
        [deployment.project_id]
      );

      if (rows.length) {
        targetDeploymentId = rows[0].id;
      }
    }

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

    return rows.map(runtime => ({
      ...runtime,
      url: runtime.route || null,
    }));
  }
  async latest(deploymentId) {
    const { rows } = await db.query(
      `
    SELECT *
    FROM deployment_services
    WHERE deployment_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
      [deploymentId]
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
      [deploymentId],
    );

    return rows.map((runtime) => ({
      ...runtime,
      url: runtime.route
        ? `${runtime.route}`
        : null,
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
