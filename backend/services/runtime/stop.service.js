const dockerService = require("../docker/docker.service");
const runtimeResolver = require("./runtime-resolver.service");
const db = require("../../config/db");

class StopService {
  async stop(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    await dockerService.execute(
      "docker",
      ["stop", runtime.container_name],
      deploymentId,
    );

    await db.query(
      `
UPDATE deployment_services
SET status='STOPPED'
WHERE deployment_id=$1
`,
      [deploymentId],
    );

    return runtime;
  }
}

module.exports = new StopService();
