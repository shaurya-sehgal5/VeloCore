const kubectl = require("./kubectl.service");

class KubernetesActionService {
  restart(deployment) {
    return kubectl.restart(deployment);
  }

  stop(deployment) {
    return kubectl.scale(deployment, 0);
  }

  start(deployment) {
    return kubectl.scale(deployment, 1);
  }

  delete(deployment) {
    return Promise.all([
      kubectl.execute(["delete", "deployment", deployment]),
      kubectl.execute(["delete", "service", deployment]),
    ]);
  }

  logs(pod) {
    return kubectl.streamLogs(pod);
  }

  describe(pod) {
    return kubectl.execute(["describe", "pod", pod]);
  }
}

module.exports = new KubernetesActionService();