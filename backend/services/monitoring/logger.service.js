const { getIO } = require("../../config/socket");
const events = require("../deployment/deployment-event.service");
const runtimeStatus = require("../runtime/runtime-status.service");
const loki = require("./loki/loki.service");

class LoggerService {
  constructor() {
    /*
    --------------------------------------------------
    INTERNAL / RAW STAGES
    --------------------------------------------------
    These are NOT normal dashboard logs.
    They are intended for Detailed Logs.
    --------------------------------------------------
    */

    this.rawStages = new Set([
      "DOCKER",
      "HELM_STDOUT",
      "KUBECTL_STDOUT",
      "NPM",
      "GIT",
      "TRIVY",
      "GITLEAKS",
      "SONARQUBE",
      "AUDIT",
    ]);

    /*
    --------------------------------------------------
    IMPORTANT DB EVENTS
    --------------------------------------------------
    */

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

      "BUILD_PHASE_STARTED",
      "BUILD_PHASE_COMPLETED",

      "SECURITY_SCAN_STARTED",
      "SECURITY_SCAN_COMPLETED",

      "RUNTIME_RUNNING",
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

  /*
  ==================================================
  NORMAL LOG
  ==================================================
  Used by VeloCore's clean dashboard logs.

  Goes to:
    - console
    - SSE
    - Socket.IO
    - Loki

  Does NOT contain noisy raw tool output.
  ==================================================
  */

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
      detailed: false,
      ...log,
    };

    /*
    ------------------------------------------
    Normal dashboard stream
    ------------------------------------------
    */

    if (!this.rawStages.has(stage)) {
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

    /*
    ------------------------------------------
    Loki
    ------------------------------------------

    Only meaningful VeloCore logs go to Loki.
    Raw tool output never reaches Loki.
    ------------------------------------------
    */

    if (!this.rawStages.has(stage)) {
      try {
        await loki.push({
          deploymentId,
          project: project || deploymentId,
          stage,
          level,
          message,
        });
      } catch (_) {
        // Loki must never break deployment
      }
    }
  }

  /*
  ==================================================
  DETAILED LOG
  ==================================================

  Used for:
    Docker
    npm
    Git
    Helm
    kubectl
    Trivy
    Gitleaks
    SonarQube
    Runtime output
    etc.

  Goes ONLY to:
    - console
    - Socket.IO detailed_logs

  NEVER goes to Loki.
  NEVER goes to normal dashboard logs.
  ==================================================
  */

  async detail(
    deploymentId,
    stage,
    level,
    message,
    project = null
  ) {
    const log = this.create(
      level,
      stage,
      message,
      true
    );

    this.console(log);

    const payload = {
      type: "detailed_log",
      detailed: true,
      project,
      ...log,
    };

    try {
      const io = getIO();

      io.to(deploymentId).emit(
        "detailed_logs",
        payload
      );
    } catch (_) { }

    /*
    ------------------------------------------
    Detailed logs are intentionally NOT
    written to Loki.
    ------------------------------------------
    */
  }

  /*
  ==================================================
  RAW ALIAS
  ==================================================
  */

  async raw(
    deploymentId,
    stage,
    level,
    message,
    project = null
  ) {
    await this.detail(
      deploymentId,
      stage,
      level,
      message,
      project
    );
  }

  /*
  ==================================================
  DATABASE DEPLOYMENT EVENT
  ==================================================
  */

  async event(
    deploymentId,
    event,
    message
  ) {
    if (!this.dbEvents.has(event)) {
      return;
    }

    try {
      await events.emit({
        deploymentId,
        event,
        message,
      });
    } catch (err) {
      console.error(
        `[EVENT] Failed to emit ${event}: ${err.message}`
      );
    }
  }

  /*
  ==================================================
  INFO
  ==================================================
  */

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

  /*
  ==================================================
  SUCCESS
  ==================================================
  */

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

  /*
  ==================================================
  WARNING
  ==================================================
  */

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

  /*
  ==================================================
  ERROR
  ==================================================
  */

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

  /*
  ==================================================
  SECTION
  ==================================================
  */

  async section(
    deploymentId,
    title
  ) {
    await this.live(
      deploymentId,
      "SECTION",
      "INFO",
      title
    );
  }

  /*
  ==================================================
  REPOSITORY
  ==================================================
  */

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

  /*
  ==================================================
  SUMMARY
  ==================================================
  */

  async summary(
    deploymentId,
    summary
  ) {
    await this.live(
      deploymentId,
      "SUMMARY",
      "SUCCESS",
      summary
    );
  }

  /*
  ==================================================
  MILESTONE
  ==================================================
  */

  async milestone(
    deploymentId,
    event,
    stage,
    message,
    project = null
  ) {
    await this.event(
      deploymentId,
      event,
      message
    );

    await this.success(
      deploymentId,
      stage,
      message,
      project
    );
  }
}

module.exports = new LoggerService();