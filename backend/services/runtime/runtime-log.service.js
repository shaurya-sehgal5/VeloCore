const runtimeAdapter = require("./runtime-adapter.service");
const logger = require("../monitoring/logger.service");

class RuntimeLogService {
  async stream(runtime, deploymentId) {
     logger.info(
      deploymentId,
      "RUNTIME",
      "Runtime log streaming started."
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
        logger.live(
          deploymentId,
          "RUNTIME",
          "INFO",
          line
        );
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

        logger.live(
          deploymentId,
          "RUNTIME",
          "ERROR",
          line
        );
      }
    });

    logs.on("error", (err) => {
      logger.error(
        deploymentId,
        "RUNTIME",
        err.message
      );
    });

    logs.on("close", async (code) => {
       logger.info(
        deploymentId,
        "RUNTIME",
        `Runtime log stream closed (${code})`
      );
    });

    return logs;
  }
}

module.exports = new RuntimeLogService();