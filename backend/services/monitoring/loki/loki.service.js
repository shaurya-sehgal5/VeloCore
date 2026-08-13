const axios = require("axios");
const config = require("./loki.config");

class LokiService {

    async query({
        query,
        start,
        end,
        limit = 500,
        direction = "BACKWARD",
    }) {
        try {
            const { data } = await axios.get(
                `${config.url}/loki/api/v1/query_range`,
                {
                    params: {
                        query,
                        start,
                        end,
                        limit,
                        direction,
                    },
                }
            );

            return data.data.result || [];

        } catch (err) {

            console.error(
                "[LOKI QUERY]",
                err.message
            );

            return [];
        }
    }

    async error(
        error,
        deploymentId = "system"
    ) {

        return this.push({
            deploymentId,
            stage: "ERROR",
            level: "ERROR",
            message:
                error.stack ||
                error.message ||
                String(error),
        });
    }

    /*
    ==================================================
    PUSH VALUABLE LOG
    ==================================================

    IMPORTANT:

    This function should ONLY be called by
    VeloCore's normal/important logger.

    Raw Docker/npm/kubectl output must NOT
    be sent here.
    ==================================================
    */

    async push({
        deploymentId,
        project = "unknown",
        stage = "SYSTEM",
        level = "INFO",
        message,
    }) {

        if (
            !deploymentId ||
            !message
        ) {
            return;
        }

        try {

            const payload = {
                streams: [
                    {
                        stream: {
                            app: config.labels.app,
                            service_name: "velocore",
                            component: config.labels.component,
                            environment: config.labels.environment,

                            deployment: deploymentId,
                            project,
                            stage,
                            level,
                        },

                        values: [
                            [
                                `${Date.now()}000000`,
                                String(message),
                            ],
                        ],
                    },
                ],
            };

            await axios.post(
                `${config.url}/loki/api/v1/push`,
                payload,
                {
                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    timeout: 5000,
                }
            );

        } catch (err) {

            /*
            Loki must NEVER break a deployment.
            */

            console.error(
                "[LOKI PUSH]",
                err.message
            );
        }
    }
}

module.exports = new LokiService();