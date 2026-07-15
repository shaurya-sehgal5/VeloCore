const kubectl = require("./kubectl.service");

class KubernetesRuntimeService {
  restart(deployment) {
    return kubectl.restart(deployment);
  }

  stop(deployment) {
    return kubectl.scale(deployment, 0);
  }

  start(deployment) {
    return kubectl.scale(deployment, 1);
  }

  async destroy(deployment) {
    await kubectl.execute(["delete", "deployment", deployment]);

    await kubectl.execute(["delete", "service", deployment]);
  }

  logs(pod, follow = false) {
    if (follow) {
      return kubectl.streamLogs(pod);
    }

    return kubectl.execute(["logs", "--tail=200", pod]);
  }

  stats(pod) {
    return kubectl.execute(["top", "pod", pod, "--no-headers"]);
  }
}

module.exports = new KubernetesRuntimeService();
