const runtimeResolver = require("./runtime-resolver.service");
const runtimeAdapter = require("./runtime-adapter.service");

class DescribeService {
  async describe(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    return runtimeAdapter.describe(runtime);
  }
}

module.exports = new DescribeService();