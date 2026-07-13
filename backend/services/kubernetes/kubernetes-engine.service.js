const kubernetesService = require("./kubernetes.service");
const kubectl = require("./kubectl.service");
const runtimeRegistry = require("../runtime/runtime-registry.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const statusService = require("../monitoring/status.service");
const logger = require("../monitoring/logger.service");
const kubernetesLogs = require("./kubernetes-log.service");

class KubernetesEngine {
  async deploy(buildPlan, deploymentId) {
    logger.deployment(deploymentId, "☸ Generating Kubernetes Manifest...");

    const file = await kubernetesService.generate(buildPlan);

    logger.deployment(deploymentId, "☸ Applying Manifest...");

    await kubectl.apply(file);

    logger.deployment(deploymentId, "⏳ Waiting for rollout...");

    await kubectl.rollout(buildPlan.projectName);

    const pod = await kubectl.getPod(buildPlan.projectName);

    const service = await kubectl.getService(buildPlan.projectName);

    kubernetesLogs.stream(pod.metadata.name, deploymentId);

    runtimeManager.register({
      deploymentId,
      project: buildPlan.projectName,
      slot: buildPlan.slot,
      type: buildPlan.type,
      framework: buildPlan.framework,

      engine: "kubernetes",

      deployment: buildPlan.projectName,

      service: buildPlan.projectName,

      pod: pod.metadata.name,

      namespace: "default",
    });
    await runtimeRegistry.register({
      deploymentId,

      name: buildPlan.projectName,

      type: buildPlan.type,

      framework: buildPlan.framework,

      imageName: buildPlan.imageName,

      containerName: pod.metadata.name,

      hostPort: service.spec.ports[0].nodePort,

      containerPort: service.spec.ports[0].port,

      slot: buildPlan.slot,

      engine: "kubernetes",
    });
    await statusService.update(deploymentId, "RUNNING");

    logger.deployment(deploymentId, "✅ Kubernetes Deployment Ready");

    return {
      deploymentId,
      project: buildPlan.projectName,
      engine: "kubernetes",
    };
  }
}

module.exports = new KubernetesEngine();
