const axios = require("axios");
const logger = require("./logger.service");

class HealthService {

    async waitUntilHealthy({

        hostPort,
        deploymentId,
        retries = 15,
        delay = 2000

    }) {

        logger.deployment(
            deploymentId,
            "🏥 Waiting for application health..."
        );

        for (let attempt = 1; attempt <= retries; attempt++) {

            try {

                await axios.get(
                    `http://localhost:${hostPort}`,
                    {
                        timeout: 3000
                    }
                );

                logger.deployment(
                    deploymentId,
                    "✅ Health check passed."
                );

                return true;

            }

            catch {

                logger.deployment(
                    deploymentId,
                    `⏳ Health check ${attempt}/${retries}`
                );

                await new Promise(resolve =>
                    setTimeout(resolve, delay)
                );

            }

        }

        throw new Error(
            "Application failed health check."
        );

    }

}

module.exports = new HealthService();