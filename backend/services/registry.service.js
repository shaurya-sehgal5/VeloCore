const db = require("../config/db");

class RegistryService {
  async register({
    deploymentId,
    name,
    type,
    framework,
    imageName,
    containerName,
    hostPort,
    containerPort,
  }) {
    /*
    ------------------------------------
    Update deployment
    ------------------------------------
    */

    await db.query(
      `
      UPDATE deployments
      SET
        image_name = $1,
        container_name = $2,
        host_port = $3,
        container_port = $4,
        updated_at = NOW()
      WHERE id = $5
      `,
      [
        imageName,
        containerName,
        hostPort,
        containerPort,
        deploymentId,
      ]
    );

    /*
    ------------------------------------
    Register service
    ------------------------------------
    */

    await db.query(
      `
      INSERT INTO deployment_services
      (
        deployment_id,
        name,
        type,
        framework,
        status,
        image_name,
        container_name,
        host_port,
        container_port
      )
      VALUES
      (
        $1,$2,$3,$4,'RUNNING',$5,$6,$7,$8
      )
      `,
      [
        deploymentId,
        name,
        type,
        framework,
        imageName,
        containerName,
        hostPort,
        containerPort,
      ]
    );
  }
}

module.exports = new RegistryService();