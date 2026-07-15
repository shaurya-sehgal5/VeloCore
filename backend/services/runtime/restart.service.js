const runtimeResolver = require("./runtime-resolver.service");
const runtimeAction = require("./runtime-action.service");

class RestartService {
  async restart(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    await runtimeAction.restart(runtime);

    return runtime;
  }
}

module.exports = new RestartService();