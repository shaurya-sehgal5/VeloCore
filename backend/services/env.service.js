const db = require("../config/db");

class EnvService {

    async get(deploymentId) {

        const result = await db.query(

            `
            SELECT env_key, env_value
            FROM deployment_envs
            WHERE deployment_id = $1
            `,

            [deploymentId]

        );

        const env = {};

        for (const row of result.rows) {

            env[row.env_key] = row.env_value;

        }

        return env;

    }

    async save(deploymentId, env) {

        await db.query(

            `
            DELETE FROM deployment_envs
            WHERE deployment_id = $1
            `,

            [deploymentId]

        );

        for (const [key, value] of Object.entries(env)) {

            await db.query(

                `
                INSERT INTO deployment_envs
                (
                    deployment_id,
                    env_key,
                    env_value
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,

                [
                    deploymentId,
                    key,
                    value
                ]

            );

        }

    }

}

module.exports = new EnvService();