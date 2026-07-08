const axios = require("axios");
const logger = require("./logger.service");

class HealthService {

    async waitUntilHealthy({

        hostPort,
        deploymentId,
        retries = 10,
        delay = 2000

    }) {

        logger.deployment(
            deploymentId,
            "🏥 Waiting for application health..."
        );

        const endpoints = [

            "/health",

            "/"

        ];

        for (let attempt = 1; attempt <= retries; attempt++) {

            for (const endpoint of endpoints) {

                try {

                    const response = await axios.get(

                        `http://localhost:${hostPort}${endpoint}`,

                        {

                            timeout: 3000,

                            validateStatus: () => true

                        }

                    );

                    if (response.status >= 200 && response.status < 400) {

                        logger.deployment(

                            deploymentId,

                            `✅ Health check passed (${endpoint})`

                        );

                        return true;

                    }

                }

                catch (_) {}

            }

            logger.deployment(

                deploymentId,

                `⏳ Health check ${attempt}/${retries}`

            );

            await new Promise(resolve =>
                setTimeout(resolve, delay)
            );

        }

        throw new Error(
            "Application failed health check."
        );

    }

}

module.exports = new HealthService();