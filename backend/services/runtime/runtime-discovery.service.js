const dockerService = require("../docker/docker.service");
const kubernetesDiscovery = require("../kubernetes/kubernetes-discovery.service");
const runtimeManager = require("./runtime-manager.service");
const metrics = require("../monitoring/metrics.service");

class RuntimeDiscoveryService {
  async recover() {
    console.log("🔄 Recovering Docker runtimes...");

    /*
    ------------------------------------
    Docker
    ------------------------------------
    */

    const containers = await dockerService.listContainers();

    for (const containerId of containers) {
      const info = await dockerService.inspectContainer(containerId);

      const labels = info.Config.Labels || {};

      if (!labels.deploymentId) continue;

      runtimeManager.register({
        deploymentId: labels.deploymentId,
        project: labels.project,
        slot: labels.slot,
        framework: labels.framework,
        type: labels.type,

        imageName: labels.imageName,

        containerName: info.Name.replace("/", ""),

        hostPort:
          info.NetworkSettings.Ports?.[
            `${labels.containerPort}/tcp`
          ]?.[0]?.HostPort,

        containerPort: Number(labels.containerPort),

        engine: "docker",
      });
    }

    /*
    ------------------------------------
    Kubernetes
    ------------------------------------
    */

    console.log("🔄 Recovering Kubernetes runtimes...");

    await kubernetesDiscovery.recover();

    /*
    ------------------------------------
    Metrics
    ------------------------------------
    */

    console.log(
      `✅ Recovered ${runtimeManager.list().length} runtime(s).`,
    );

    metrics.runtimeCount.set(runtimeManager.list().length);
  }
}

module.exports = new RuntimeDiscoveryService();