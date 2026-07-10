const { getIO } = require("../../config/socket");
const events = require("../deployment/deployment-event.service");
const runtimeStatus = require("../runtime/runtime-status.service");

class LoggerService {
  log(level, message) {
    console.log(`[${level}] ${message}`);
  }

  info(message) {
    this.log("INFO", message);
  }

  success(message) {
    this.log("SUCCESS", message);
  }

  warning(message) {
    this.log("WARNING", message);
  }

  error(message) {
    this.log("ERROR", message);
  }

  deployment(deploymentId, message) {
    this.info(message);
    events.create(deploymentId, "LOG", message).catch(() => {});
    runtimeStatus.publish(deploymentId, {
      type: "log",
      message,
      timestamp: Date.now(),
    });
    try {
      const io = getIO();

      io.to(deploymentId).emit("live_logs", message);
    } catch (_) {
      // Socket server not initialized
    }
  }
  success(deploymentId, message) {
    this.deployment(deploymentId, `✅ ${message}`);
  }

  warning(deploymentId, message) {
    this.deployment(deploymentId, `⚠ ${message}`);
  }

  failure(deploymentId, message) {
    this.deployment(deploymentId, `❌ ${message}`);
  }
}

module.exports = new LoggerService();
