const kubectl = require("./kubectl.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const logger = require("../monitoring/logger.service");

class KubernetesDiscoveryService {
  async recover() {
    const output = await kubectl.execute([
      "get",
      "deployments",
      "-o",
      "json",
    ]);

    const deployments = JSON.parse(output).items;

    for (const deployment of deployments) {
      const name = deployment.metadata.name;

      const pod = await kubectl.getPod(
        name,
        deployment.metadata.namespace
      );

      const service = await kubectl.getService(
        name,
        deployment.metadata.namespace
      );

      runtimeManager.register({
        deploymentId: `recovered-${name}`,

        project: name,

        deployment: name,

        service: name,

        pod: pod.metadata.name,

        namespace: deployment.metadata.namespace,

        engine: "kubernetes",

        hostPort: service.spec.ports[0].nodePort,

        containerPort: service.spec.ports[0].port,

        startedAt: Date.now(),
      });

      logger.info?.(`Recovered Kubernetes deployment ${name}`);
    }
  }
}

module.exports = new KubernetesDiscoveryService();