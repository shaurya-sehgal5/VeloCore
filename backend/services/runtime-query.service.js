const db = require("../config/db");

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

                host_port,

                container_port,

                image_name,

                container_name,

                created_at

            FROM deployment_services

            WHERE deployment_id = $1

            ORDER BY created_at ASC
            `,

            [deploymentId]

        );

        return rows.map(runtime => ({

            ...runtime,

            url: `http://localhost:${runtime.host_port}`

        }));

    }

}

module.exports = new RuntimeQueryService();