const db = require("../../config/db");

class RuntimeQueryService {
  async getByDeployment(deploymentId) {
    const { rows } = await db.query(
      `
     SELECT
    id,
    name,
    type,
    framework,
    status,
    engine,
    host_port,
    route,
    container_port,
    image_name,
    container_name,
    slot,
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
        ? `http://localhost${runtime.route}`
        : null,
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
        ? `http://localhost${runtime.route}`
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
