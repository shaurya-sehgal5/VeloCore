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
const metrics = require("../monitoring/metrics.service");
const portForwardService = require("./port-forward.service");

class KubernetesEngine {
  async deploy(buildPlan, deploymentId) {
    await logger.info(
      deploymentId,
      "KUBERNETES",
      "Generating Kubernetes manifest..."
    );

    const file = await kubernetesService.generate(buildPlan);

    await logger.info(
      deploymentId,
      "KUBERNETES",
      "Applying manifest..."
    );
    await namespaceService.ensure(buildPlan.namespace);

    await kubectl.apply(file);
    // await fs.unlink(file).catch(() => { });
    await logger.info(
      deploymentId,
      "KUBERNETES",
      "Waiting for rollout..."
    );

    const rolloutStart = Date.now();
    try {

      await kubectl.rollout(
        buildPlan.projectName,
        buildPlan.namespace
      );
    }
    finally {
      metrics.rolloutDuration.observe(
        (Date.now() - rolloutStart) / 1000
      );
    }

    const [pod, service] = await Promise.all([
      kubectl.getPod(
        buildPlan.projectName,
        buildPlan.namespace
      ),
      kubectl.getService(
        buildPlan.projectName,
        buildPlan.namespace
      ),
    ]);
    const localPort = await portForwardService.start(
      buildPlan.projectName,
      buildPlan.namespace,
      buildPlan.containerPort
    );

    await logger.success(
      deploymentId,
      "KUBERNETES",
      `Port forwarding started on localhost:${localPort}`
    );
    if (!pod) {
      throw new Error(
        `No running pod found for ${buildPlan.projectName}`
      );
    }
    const url = `http://localhost:8000/visit/${deploymentId}`;
    setImmediate(() => {
      const logStream = kubernetesLogs.stream(
        pod.metadata.name,
        deploymentId,
        buildPlan.namespace
      );

      logStream.on("error", (err) => {
        logger.error(
          deploymentId,
          "KUBERNETES",
          `Log stream error: ${err.message}`
        );
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
      branch: buildPlan.branch,

      hostPort: localPort,
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
      branch: buildPlan.branch,
      hostPort: localPort,
      containerPort: service.spec.ports[0].port,

      slot: buildPlan.slot,

      engine: "kubernetes",

      deployment: buildPlan.projectName,

      service: buildPlan.projectName,

      pod: pod.metadata.name,
    });


    await statusService.update(deploymentId, "RUNNING");
    metrics.runtimeStartupDuration.observe(
      process.uptime()
    );
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
