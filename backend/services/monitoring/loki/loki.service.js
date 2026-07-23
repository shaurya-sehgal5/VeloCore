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
            console.error("[LOKI QUERY]", err.message);
            return [];
        }
    }
    async error(error, deploymentId = "system") {
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
    async push({
        deploymentId,
        project = "unknown",
        stage = "SYSTEM",
        level = "INFO",
        message,
    }) {
        try {
            const payload = {
                streams: [
                    {
                        stream: {
                            app: config.labels.app,
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
                                message,
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
                        "Content-Type": "application/json",
                    },
                    timeout: 5000,
                }
            );

        } catch (err) {
            console.error(
                "[LOKI]",
                err.message
            );
        }
    }
}

module.exports = new LokiService();