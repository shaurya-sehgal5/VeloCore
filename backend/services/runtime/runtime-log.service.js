const runtimeAdapter = require("./runtime-adapter.service");
const logger = require("../monitoring/logger.service");

class RuntimeLogService {

  async stream(
    runtime,
    deploymentId
  ) {

    /*
    ------------------------------------------
    Normal dashboard message
    ------------------------------------------
    */

    await logger.info(
      deploymentId,
      "RUNTIME",
      "Runtime log streaming started."
    );

    const logs =
      await runtimeAdapter.logs(runtime);

    /*
    ==========================================
    STDOUT
    ==========================================
    */

    logs.stdout.on(
      "data",
      (data) => {

        const lines = data
          .toString()
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        for (const line of lines) {

          if (
            line.startsWith(">") ||
            line.includes("npm notice") ||
            line.includes("Debugger attached")
          ) {
            continue;
          }

          logger.detail(
            deploymentId,
            "RUNTIME",
            "INFO",
            line
          );
        }
      }
    );

    /*
    ==========================================
    STDERR
    ==========================================
    */

    logs.stderr.on(
      "data",
      (data) => {

        const lines = data
          .toString()
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        for (const line of lines) {

          if (
            line.startsWith(">") ||
            line.includes("npm notice") ||
            line.includes("Debugger attached")
          ) {
            continue;
          }

          logger.detail(
            deploymentId,
            "RUNTIME",
            "ERROR",
            line
          );
        }
      }
    );

    /*
    ==========================================
    STREAM ERROR
    ==========================================
    */

    logs.on(
      "error",
      (err) => {

        logger.error(
          deploymentId,
          "RUNTIME",
          err.message
        );
      }
    );

    /*
    ==========================================
    STREAM CLOSED
    ==========================================
    */

    logs.on(
      "close",
      async (code) => {

        await logger.info(
          deploymentId,
          "RUNTIME",
          `Runtime log stream closed (${code})`
        );
      }
    );

    return logs;
  }
}

module.exports =
  new RuntimeLogService();