const runtimeResolver = require("./runtime-resolver.service");
const runtimeAction = require("./runtime-action.service");
const portForwardService = require("../kubernetes/port-forward.service");
const db = require("../../config/db");
const metrics = require("../monitoring/metrics.service"); // <-- use your actual metrics module

class StopService {
  async stop(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    await portForwardService.stop(runtime.service);

    await runtimeAction.stop(runtime);

    await db.query(
      `
      UPDATE deployment_services
      SET status='STOPPED'
      WHERE deployment_id=$1
      `,
      [deploymentId]
    );

    metrics.deploymentStatus
      .labels(
        runtime.deploymentId,
        runtime.project,
        runtime.namespace
      )
      .set(0);

    return {
      success: true,
      deploymentId,
      status: "STOPPED",
    };
  }
}

module.exports = new StopService();