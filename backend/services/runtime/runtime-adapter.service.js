const dockerMetrics = require("../monitoring/docker-metrics.service");
const kubernetesMetrics = require("../monitoring/kubernetes-metrics.service");

const dockerService = require("../docker/docker.service");
const kubernetesAction = require("../kubernetes/kubernetes-action.service");

class RuntimeAdapter {
  /*
  -------------------------
  Metrics
  -------------------------
  */

  metrics(runtime) {
    if (runtime.engine === "docker") {
      return dockerMetrics.get(runtime.containerName);
    }

    return kubernetesMetrics.get(runtime.pod);
  }

  /*
  -------------------------
  Restart
  -------------------------
  */

  restart(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute("docker", [
        "restart",
        runtime.containerName,
      ]);
    }

    return kubernetesAction.restart(runtime.deployment);
  }

  /*
  -------------------------
  Stop
  -------------------------
  */

  stop(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.stopContainer(runtime.containerName);
    }

    return kubernetesAction.stop(runtime.deployment);
  }

  /*
  -------------------------
  Delete
  -------------------------
  */

  delete(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.removeContainer(runtime.containerName);
    }

    return kubernetesAction.delete(runtime.deployment);
  }

  /*
  -------------------------
  Logs
  -------------------------
  */

  logs(runtime) {
  if (runtime.engine === "docker") {
    const { spawn } = require("child_process");

    return spawn("docker", [
      "logs",
      "-f",
      runtime.containerName,
    ]);
  }

  return require("../kubernetes/kubectl.service")
    .streamLogs(runtime.pod, runtime.namespace);
}

  /*
  -------------------------
  Describe
  -------------------------
  */

  describe(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute("docker", [
        "inspect",
        runtime.containerName,
      ]);
    }

    return kubernetesAction.describe(runtime.pod);
  }
}

module.exports = new RuntimeAdapter();