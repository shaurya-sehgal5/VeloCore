const db = require("../../config/db");

class DeploymentQueryService {

    async getServices(deploymentId) {

        const { rows } = await db.query(

            `
            SELECT

                id,

                name,

                type,

                status,

                host_port,

                container_port,

                image_name,

                container_name

            FROM deployment_services

            WHERE deployment_id = $1

            ORDER BY created_at
            `,

            [deploymentId]

        );

        return rows;

    }

}

module.exports = new DeploymentQueryService();