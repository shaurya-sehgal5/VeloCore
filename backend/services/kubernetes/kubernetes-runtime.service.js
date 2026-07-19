const kubectl = require("./kubectl.service");

class KubernetesRuntimeService {
  restart(deployment, namespace) {
    return kubectl.restart(
      deployment,
      namespace
    );
  }

  stop(deployment, namespace) {
    return kubectl.scale(
      deployment,
      0,
      namespace
    );
  }
  start(deployment, namespace) {
    return kubectl.scale(
      deployment,
      1,
      namespace
    );
  }

  async destroy(deployment, namespace) {
    await kubectl.deleteDeployment(
      deployment,
      namespace
    );

    await kubectl.deleteService(
      deployment,
      namespace
    );
  } F

  logs(pod, namespace, follow = false) {
    if (follow) {
      return kubectl.streamLogs(pod);
    }
    return kubectl.logs(
      pod,
      namespace,
      follow
    );
  }

  stats(pod) {
    return kubectl.execute(["top", "pod", pod, "--no-headers"]);
  }
}

module.exports = new KubernetesRuntimeService();
