const runtimeProvider = require("../runtime/runtime-provider.service");
const runtimePipeline = require("../runtime/runtime-pipeline.service");
const kubernetesEngine = require("../kubernetes/kubernetes-engine.service");
const deploymentEvents = require("../deployment/deployment-event.service");

class DeploymentEngine {
  async deploy(options) {
    if (options.engine === "kubernetes") {
      return kubernetesEngine.deploy(
        options.buildPlan,
        options.deploymentId,
      );
    }
    const runtime = await runtimeProvider.create(options);

    await deploymentEvents.emit({
      deploymentId: options.deploymentId,
      event: "RUNTIME_CREATED",
      message: `${options.engine} runtime created`
    });
    runtimePipeline.start(runtime).catch((err) => {
      console.error("Runtime pipeline failed:", err);
    });
    await deploymentEvents.emit({
      deploymentId: options.deploymentId,
      event: "RUNTIME_PIPELINE_STARTED",
      message: "Runtime monitoring pipeline started"
    });
    return runtime;
  }
}

module.exports = new DeploymentEngine();