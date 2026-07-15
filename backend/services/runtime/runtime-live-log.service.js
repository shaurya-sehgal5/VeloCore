const runtimeResolver = require("./runtime-resolver.service");
const runtimeAction = require("./runtime-action.service");

class RuntimeLiveLogService {
  async stream(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    if (runtime.engine === "docker") {
      return null;
    }

    return runtimeAction.logs(runtime, true);
  }
}

module.exports = new RuntimeLiveLogService();