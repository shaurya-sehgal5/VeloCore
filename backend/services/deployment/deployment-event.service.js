const db = require("../../config/db");
const { getIO } = require("../../config/socket");
const loki = require("../monitoring/loki/loki.service");

class DeploymentEventService {
  async emit({
    deploymentId,
    event,
    message,
    level = "INFO",
  }) {
    const { rows } = await db.query(
      `
      INSERT INTO deployment_events
      (
        deployment_id,
        event,
        message
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [deploymentId, event, message]
    );
    await loki.push({
      deploymentId,
      stage: event,
      level: "INFO",
      message,
    });
    try {
      const io = getIO();

      io.to(deploymentId).emit("deployment_event", rows[0]);
    } catch (_) { }

    return rows[0];
  }
  async list(deploymentId) {
    const { rows } = await db.query(
      `
    SELECT *
    FROM deployment_events
    WHERE deployment_id = $1
    ORDER BY created_at ASC
    `,
      [deploymentId]
    );

    const stageMap = {
      DEPLOYMENT_STARTED: {
        stage: "Deployment",
        status: "success",
      },

      WORKSPACE_READY: {
        stage: "Workspace",
        status: "success",
      },

      REPOSITORY_CLONED: {
        stage: "Clone",
        status: "success",
      },

      REPOSITORY_ANALYZED: {
        stage: "Analysis",
        status: "success",
      },

      SECURITY_COMPLETED: {
        stage: "Security",
        status: "success",
      },

      BUILD_COMPLETED: {
        stage: "Build",
        status: "success",
      },

      DEPLOYMENT_COMPLETED: {
        stage: "Running",
        status: "success",
      },

      DEPLOYMENT_FAILED: {
        stage: "Failed",
        status: "failed",
      },
    };

    return rows
      .filter(r => stageMap[r.event])
      .map(r => ({
        id: r.id,
        stage: stageMap[r.event].stage,
        status: stageMap[r.event].status,
        message: r.message,
        timestamp: r.created_at,
      }));
  }
}

module.exports = new DeploymentEventService();