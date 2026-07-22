const db = require("../../config/db");

class RuntimeResolver {
  async resolve(deploymentId) {
    const { rows } = await db.query(
      `
SELECT
deployment_id,
name,
type,
framework,
image_name,
container_name,
host_port,
container_port,
status,

slot,
engine,
namespace,

deployment_name AS deployment,
service_name AS service,
host

FROM deployment_services
WHERE deployment_id=$1
LIMIT 1
`,
      [deploymentId]
    );

    if (rows.length === 0) {
      throw new Error("Runtime not found.");
    }

    return rows[0];
  }
}

module.exports = new RuntimeResolver();