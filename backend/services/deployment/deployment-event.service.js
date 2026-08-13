const db = require("../../config/db");
const { getIO } = require("../../config/socket");

class DeploymentEventService {

  /*
  ==================================================
  CREATE EVENT
  ==================================================
  */

  async emit({
    deploymentId,
    event,
    message,
    level = "INFO",
  }) {

    const { rows } =
      await db.query(
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
        [
          deploymentId,
          event,
          message,
        ]
      );

    /*
    ------------------------------------------
    Realtime timeline event
    ------------------------------------------
    */

    try {

      const io = getIO();

      io.to(deploymentId).emit(
        "deployment_event",
        rows[0]
      );

    } catch (_) { }

    return rows[0];
  }

  /*
  ==================================================
  LIST TIMELINE EVENTS
  ==================================================
  */

  async list(deploymentId) {

    const { rows } =
      await db.query(
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
        stage: "deployment",
        status: "success",
      },

      WORKSPACE_READY: {
        stage: "workspace",
        status: "success",
      },

      REPOSITORY_CLONED: {
        stage: "clone",
        status: "success",
      },

      REPOSITORY_ANALYZED: {
        stage: "analysis",
        status: "success",
      },

      BUILD_STARTED: {
        stage: "build",
        status: "running",
      },

      BUILD_COMPLETED: {
        stage: "build",
        status: "success",
      },

      SECURITY_STARTED: {
        stage: "security",
        status: "running",
      },

      SECURITY_COMPLETED: {
        stage: "security",
        status: "success",
      },

      SECURITY_SCAN_STARTED: {
        stage: "security",
        status: "running",
      },

      SECURITY_SCAN_COMPLETED: {
        stage: "security",
        status: "success",
      },

      DEPLOYMENT_STARTED_RUNTIME: {
        stage: "deploy",
        status: "running",
      },

      DEPLOYMENT_COMPLETED: {
        stage: "running",
        status: "success",
      },

      RUNTIME_RUNNING: {
        stage: "running",
        status: "success",
      },

      DEPLOYMENT_FAILED: {
        stage: "failed",
        status: "failed",
      },

      ROLLBACK_STARTED: {
        stage: "rollback",
        status: "rollback",
      },

      ROLLBACK_COMPLETED: {
        stage: "rollback",
        status: "success",
      },
    };

    return rows
      .filter(
        (row) => stageMap[row.event]
      )
      .map((row) => ({
        id: row.id,

        event: row.event,

        stage:
          stageMap[row.event].stage,

        status:
          stageMap[row.event].status,

        message: row.message,

        timestamp: row.created_at,
      }));
  }
}

module.exports =
  new DeploymentEventService();