const dockerService = require("../docker/docker.service");
const runtimeResolver = require("./runtime-resolver.service");

class RestartService {
  async restart(deploymentId) {
   const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    await dockerService.execute(
      "docker",
      ["restart", runtime.container_name],
      deploymentId
    );

    return runtime;
  }
}

module.exports = new RestartService();