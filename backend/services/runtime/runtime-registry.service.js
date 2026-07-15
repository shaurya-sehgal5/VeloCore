const db = require("../../config/db");
const logger = require("../monitoring/logger.service");

class RuntimeRegistryService {
async register({
  deploymentId,
  name,
  type,
  framework,
  imageName = null,
  containerName = null,
  hostPort = null,
  containerPort = null,
  slot,
  engine = "docker",
  namespace = "default",
  deployment = null,
  service = null,
  pod = null,
  host = null,
}) {
    await db.query(
      `
            DELETE FROM deployment_services
            WHERE deployment_id = $1
            AND name = $2
            `,

      [deploymentId, name],
    );

    await db.query(
      `
    INSERT INTO deployment_services(
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
    deployment_name,
    service_name,
    host
    )
    VALUES(
    $1,$2,$3,$4,$5,$6,$7,$8,
    'RUNNING',
    $9,$10,$11,$12,$13,$14
)
`,
      [
        deploymentId,
        name,
        type,
        framework,
        imageName,
        containerName || pod,
        hostPort,
        containerPort,
        slot,
        engine,
        namespace,
        deployment,
        service,
        host,
      ],
    );

    logger.deployment(deploymentId, `📦 Registered ${name}`);
  }
}

module.exports = new RuntimeRegistryService();
