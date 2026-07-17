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
      const lines = data
        .toString()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (
          line.startsWith(">") ||
          line.includes("npm notice") ||
          line.includes("Debugger attached")
        ) {
          continue;
        }

        logger.deployment(deploymentId, line);
      }
    });

    logs.stderr.on("data", (data) => {
      const lines = data
        .toString()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (
          line.startsWith(">") ||
          line.includes("npm notice") ||
          line.includes("Debugger attached")
        ) {
          continue;
        }

        logger.deployment(deploymentId, line);
      }
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