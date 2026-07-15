const runtimeProvider = require("../runtime/runtime-provider.service");
const runtimePipeline = require("../runtime/runtime-pipeline.service");
const kubernetesEngine = require("../kubernetes/kubernetes-engine.service");

class DeploymentEngine {
  async deploy(options) {
    if (options.engine === "kubernetes") {
      return kubernetesEngine.deploy(
        options.buildPlan,
        options.deploymentId,
      );
    }

    const runtime = await runtimeProvider.create(options);

    await runtimePipeline.start(runtime);

    return runtime;
  }
}

module.exports = new DeploymentEngine();