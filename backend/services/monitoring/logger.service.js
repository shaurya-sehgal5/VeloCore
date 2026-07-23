const { getIO } = require("../../config/socket");
const events = require("../deployment/deployment-event.service");
const runtimeStatus = require("../runtime/runtime-status.service");
const loki = require("./loki/loki.service");

class LoggerService {
  constructor() {
    this.dbEvents = new Set([
      "DEPLOYMENT_STARTED",
      "WORKSPACE_READY",
      "REPOSITORY_CLONED",
      "REPOSITORY_ANALYZED",
      "SECURITY_STARTED",
      "SECURITY_COMPLETED",
      "BUILD_STARTED",
      "BUILD_COMPLETED",
      "DEPLOYMENT_STARTED_RUNTIME",
      "DEPLOYMENT_COMPLETED",
      "DEPLOYMENT_FAILED",
      "RUNTIME_STARTED",
      "RUNTIME_STOPPED",
      "ROLLBACK_STARTED",
      "ROLLBACK_COMPLETED",
    ]);
  }

  timestamp() {
    return new Date().toLocaleTimeString("en-IN", {
      hour12: false,
    });
  }

  create(level, stage, message) {
    return {
      timestamp: this.timestamp(),
      level,
      stage,
      message,
    };
  }

  console(log) {
    console.log(
      `[${log.timestamp}] [${log.level}] [${log.stage}] ${log.message}`
    );
  }

  async live(deploymentId, stage, level, message) {
    const log = this.create(level, stage, message);

    this.console(log);

    runtimeStatus.publish(deploymentId, {
      type: "log",
      ...log,
    });
    await loki.push({
      deploymentId,
      stage,
      level,
      message,
    });
    try {
      const io = getIO();
      io.to(deploymentId).emit("live_logs", log);
    } catch (_) { }
  }

  async event(deploymentId, event, message) {
    if (!this.dbEvents.has(event)) {
      return;
    }

    await events.emit({
      deploymentId,
      event,
      message,
    });
  }

  async info(deploymentId, stage, message) {
    await this.live(deploymentId, stage, "INFO", message);
  }

  async success(deploymentId, stage, message) {
    await this.live(deploymentId, stage, "SUCCESS", message);
  }

  async warning(deploymentId, stage, message) {
    await this.live(deploymentId, stage, "WARNING", message);
  }

  async error(deploymentId, stage, message) {
    await this.live(deploymentId, stage, "ERROR", message);
  }
  async section(deploymentId, title) {
    await this.live(
      deploymentId,
      "SECTION",
      "INFO",
      title
    );
  }

  async repository(
    deploymentId,
    repo,
    branch,
    commit
  ) {
    await this.live(
      deploymentId,
      "REPOSITORY",
      "INFO",
      `${repo} | ${branch} | ${commit}`
    );
  }

  async summary(deploymentId, summary) {
    await this.live(
      deploymentId,
      "SUMMARY",
      "SUCCESS",
      summary
    );
  }

  async milestone(
    deploymentId,
    event,
    stage,
    message
  ) {
    await this.event(
      deploymentId,
      event,
      message
    );

    await this.success(
      deploymentId,
      stage,
      message
    );
  }
}

module.exports = new LoggerService();