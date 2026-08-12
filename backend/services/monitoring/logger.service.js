const { getIO } = require("../../config/socket");
const events = require("../deployment/deployment-event.service");
const runtimeStatus = require("../runtime/runtime-status.service");
const loki = require("./loki/loki.service");

class LoggerService {
  constructor() {
    this.hiddenStages = new Set([
      "DOCKER",
      "HELM_STDOUT",
      "KUBECTL_STDOUT",
      "NPM",
      "GIT"
    ]);
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

  create(level, stage, message, details = false) {
    return {
      timestamp: this.timestamp(),
      level,
      stage,
      message,
      details,
    };
  }

  console(log) {
    console.log(
      `[${log.timestamp}] [${log.level}] [${log.stage}] ${log.message}`
    );
  }

  async live(
    deploymentId,
    stage,
    level,
    message,
    details = false,
    project = null
  ) {
    const log = this.create(
      level,
      stage,
      message,
      details
    );

    this.console(log);

    const payload = {
      type: "log",
      project,
      ...log,
    };

    if (!this.hiddenStages.has(stage)) {
      runtimeStatus.publish(
        deploymentId,
        payload
      );

      try {
        const io = getIO();

        io.to(deploymentId).emit(
          "live_logs",
          payload
        );
      } catch (_) { }
    }

    await loki.push({
      deploymentId,
      project: project || deploymentId,
      stage,
      level,
      message,
    });
  }

  async info(
    deploymentId,
    stage,
    message,
    project = null
  ) {
    await this.live(
      deploymentId,
      stage,
      "INFO",
      message,
      false,
      project
    );
  }

  async success(
    deploymentId,
    stage,
    message,
    project = null
  ) {
    await this.live(
      deploymentId,
      stage,
      "SUCCESS",
      message,
      false,
      project
    );
  }

  async warning(
    deploymentId,
    stage,
    message,
    project = null
  ) {
    await this.live(
      deploymentId,
      stage,
      "WARNING",
      message,
      false,
      project
    );
  }

  async error(
    deploymentId,
    stage,
    message,
    project = null
  ) {
    await this.live(
      deploymentId,
      stage,
      "ERROR",
      message,
      false,
      project
    );
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