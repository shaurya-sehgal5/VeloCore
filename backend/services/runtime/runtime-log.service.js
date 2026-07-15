const runtimeAdapter = require("./runtime-adapter.service");
const logger = require("../monitoring/logger.service");

class RuntimeLogService {
  async stream(runtime, deploymentId) {
    logger.deployment(
      deploymentId,
      "📜 Streaming runtime logs...",
    );

    const logs = await runtimeAdapter.logs(runtime);

    logs.stdout.on("data", (data) => {
      logger.deployment(
        deploymentId,
        data.toString().trim(),
      );
    });

    logs.stderr.on("data", (data) => {
      logger.deployment(
        deploymentId,
        data.toString().trim(),
      );
    });

    logs.on("error", (err) => {
      logger.deployment(
        deploymentId,
        err.message,
      );
    });

    logs.on("close", (code) => {
      logger.deployment(
        deploymentId,
        `📦 Log stream ended (exit ${code})`,
      );
    });

    return logs;
  }
}

module.exports = new RuntimeLogService();