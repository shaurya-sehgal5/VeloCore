const axios = require("axios");
const logger = require("./logger.service");

class HealthService {
  async waitUntilHealthy({
    hostPort,
    deploymentId,
    retries = 8,
    delay = 500,
  }) {
    logger.deployment(
      deploymentId,
      "🏥 Waiting for application health..."
    );

    const urls = [
      `http://localhost:${hostPort}/health`,
      `http://localhost:${hostPort}/`,
    ];

    for (let attempt = 1; attempt <= retries; attempt++) {
      const results = await Promise.allSettled(
        urls.map((url) =>
          axios.get(url, {
            timeout: 1000,
            validateStatus: () => true,
          })
        )
      );

      const healthy = results.some(
        (r) =>
          r.status === "fulfilled" &&
          r.value.status >= 200 &&
          r.value.status < 400
      );

      if (healthy) {
        logger.deployment(
          deploymentId,
          `✅ Health check passed (${attempt}/${retries})`
        );

        return true;
      }

      logger.deployment(
        deploymentId,
        `⏳ Health check ${attempt}/${retries}`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error("Application failed health check.");
  }
}

module.exports = new HealthService();