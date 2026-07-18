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
const fs = require("fs/promises");

class KubernetesEngine {
  async deploy(buildPlan, deploymentId) {
    logger.deployment(deploymentId, "☸ Generating Kubernetes Manifest...");

    const file = await kubernetesService.generate(buildPlan);

    logger.deployment(deploymentId, "☸ Applying Manifest...");
    await namespaceService.ensure(buildPlan.namespace);

    await kubectl.apply(file);
    await fs.unlink(file).catch(() => { });
    logger.deployment(deploymentId, "⏳ Waiting for rollout...");

    await kubectl.rollout(
      buildPlan.projectName,
      buildPlan.namespace,
    );

    const pod = await kubectl.getPod(
      buildPlan.projectName,
      buildPlan.namespace,
    );

    const service = await kubectl.getService(
      buildPlan.projectName,
      buildPlan.namespace,
    );
    const url = `http://localhost:8000/visit/${deploymentId}`;
    const nodePort = service.spec.ports[0].nodePort;
    setImmediate(() => {
  const logStream = kubernetesLogs.stream(deploymentId, pod);

  logStream.on("data", (chunk) => {
    // If you are printing logs to your console/dashboard
    logger.info(deploymentId, chunk.toString());
  });

  logStream.on("error", (err) => {
    // This catches the stream failure cleanly without killing Node.js
    logger.error(deploymentId, `Log stream error: ${err.message}`);
  });
  
  logStream.on("end", () => {
    logger.info(deploymentId, "Log stream closed cleanly.");
  });
});

    runtimeManager.register({
      deploymentId,
      project: buildPlan.projectName,
      slot: buildPlan.slot,
      type: buildPlan.type,
      framework: buildPlan.framework,

      engine: "kubernetes",
      host: null,

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
      host: null,

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
