const runtimeResolver = require("./runtime-resolver.service");
const runtimeAction = require("./runtime-action.service");
const db = require("../../config/db");
const portForwardService = require("../kubernetes/port-forward.service");


class StopService {
  async stop(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }
    portForwardService.stop(
      runtime.service
    );
    await runtimeAction.stop(runtime);

    await db.query(
      `
      UPDATE deployment_services
      SET status='STOPPED'
      WHERE deployment_id=$1
      `,
      [deploymentId]
    );

    return runtime;
  }
}

module.exports = new StopService();