const db = require("../config/db");

class RegistryService {

    async register({
        deploymentId,
        imageName,
        containerName,
        hostPort,
        containerPort
    }) {

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
                deploymentId
            ]
        );

    }

}

module.exports = new RegistryService();