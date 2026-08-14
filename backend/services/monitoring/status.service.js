const db = require("../../config/db");
const { getIO } = require("../../config/socket");
const runtimeStatus = require("../runtime/runtime-status.service");
const metrics = require("./metrics.service");
const config = require("../../config/env");

class StatusService {
  async update(deploymentId, status) {
    await db.query(
      `
      UPDATE deployments
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [status, deploymentId]
    );

    /*
    ==================================================
    METRICS
    ==================================================
    */

    switch (status) {
      case "RUNNING": {
        const { rows } = await db.query(`
          SELECT COUNT(*)::int AS count
          FROM deployments
          WHERE status = 'RUNNING'
        `);

        metrics.runningDeployments.set(
          rows[0].count
        );

        break;
      }

      case "FAILED":
        metrics.deployments.inc({
          status: "FAILED",
          runtime:
            config.RUNTIME_ENGINE || "docker",
          framework: "mixed",
        });

        break;

      default:
        break;
    }

    try {
      runtimeStatus.publish(
        deploymentId,
        {
          type: "status",
          status,
        }
      );

      const io = getIO();

      io.to(deploymentId).emit(
        "status_update",
        {
          status,
        }
      );
    } catch (_) {
      // Socket/runtime status failures must not
      // break the deployment.
    }
  }
}

module.exports =
  new StatusService();