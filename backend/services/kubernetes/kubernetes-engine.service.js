const kubernetesService = require("./kubernetes.service");
const kubectl = require("./kubectl.service");
const runtimeRegistry = require("../runtime/runtime-registry.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const statusService = require("../monitoring/status.service");
const logger = require("../monitoring/logger.service");
const kubernetesLogs = require("./kubernetes-log.service");
const namespaceService = require("./namespaces.service");
const bus = require("../events/event-bus.service");
const events = require("../events/runtime-events");

class KubernetesEngine {
  async deploy(buildPlan, deploymentId) {
    logger.deployment(deploymentId, "☸ Generating Kubernetes Manifest...");

    const file = await kubernetesService.generate(buildPlan);

    logger.deployment(deploymentId, "☸ Applying Manifest...");
    try {
      await kubectl.delete(file);

      await kubectl.waitDeletion(buildPlan.projectName);
    } catch {}
    await namespaceService.ensure(buildPlan.namespace);

    await kubectl.apply(file);

    logger.deployment(deploymentId, "⏳ Waiting for rollout...");

    await kubectl.rollout(buildPlan.projectName);

    const pod = await kubectl.getPod(buildPlan.projectName);

    const service = await kubectl.getService(buildPlan.projectName);
    const url = buildPlan.customDomain
      ? `https://${buildPlan.customDomain}`
      : `http://${buildPlan.host}`;
    const nodePort = service.spec.ports[0].nodePort;
    kubernetesLogs.stream(pod.metadata.name, deploymentId);

    runtimeManager.register({
      deploymentId,
      project: buildPlan.projectName,
      slot: buildPlan.slot,
      type: buildPlan.type,
      framework: buildPlan.framework,

      engine: "kubernetes",
      host: buildPlan.host,

      namespace: buildPlan.namespace,

      deployment: buildPlan.projectName,

      service: buildPlan.projectName,

      pod: pod.metadata.name,
      hostPort: nodePort,
    });
    await runtimeRegistry.register({
      deploymentId,

      name: buildPlan.projectName,

      type: buildPlan.type,

      framework: buildPlan.framework,

      imageName: buildPlan.imageName,

      containerName: pod.metadata.name,
      host: buildPlan.host,

      namespace: buildPlan.namespace,

      customDomain: buildPlan.customDomain,

      tls: buildPlan.enableTLS,

      hostPort: nodePort,
      containerPort: service.spec.ports[0].port,

      slot: buildPlan.slot,

      engine: "kubernetes",
    });
    await statusService.update(deploymentId, "RUNNING");

    bus.publish(events.DEPLOYMENT_READY, {
      deploymentId,
      project: buildPlan.projectName,
    });

    return {
      deploymentId,
      project: buildPlan.projectName,
      engine: "kubernetes",
      url,
    };
  }
}

module.exports = new KubernetesEngine();
