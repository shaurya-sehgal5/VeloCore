const dockerService = require("./docker.service");
const runtimeResolver = require("./runtime-resolver.service");
const db = require("../config/db");

class DestroyService {
  async destroy(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    await dockerService.execute(
      "docker",
      ["rm", "-f", runtime.container_name],
      deploymentId
    );

    await db.query(
      `
      DELETE FROM deployment_services
      WHERE deployment_id = $1
      `,
      [deploymentId]
    );

    return {
      success: true,
    };
  }
}

module.exports = new DestroyService();