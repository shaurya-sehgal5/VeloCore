const runtimeResolver = require("./runtime-resolver.service");
const runtimeAction = require("./runtime-action.service");
const db = require("../../config/db");

class DestroyService {
  async destroy(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    await runtimeAction.destroy(runtime);

    await db.query(
      `
      DELETE FROM deployment_services
      WHERE deployment_id=$1
      `,
      [deploymentId]
    );

    return {
      success: true,
    };
  }
}

module.exports = new DestroyService();