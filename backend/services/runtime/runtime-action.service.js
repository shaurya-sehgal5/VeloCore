const dockerService = require("../docker/docker.service");
const kubernetesService = require("../kubernetes/kubernetes-runtime.service");

class RuntimeActionService {
  restart(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        ["restart", runtime.container_name]
      );
    }
    return kubernetesService.restart(
      runtime.deployment,
      runtime.namespace
    );
  }

  stop(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        ["stop", runtime.container_name]
      );
    }

    kubernetesService.stop(
      runtime.deployment,
      runtime.namespace
    );
  }

  start(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        ["start", runtime.container_name]
      );
    }
    kubernetesService.start(
      runtime.deployment,
      runtime.namespace
    );
  }

  destroy(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        ["rm", "-f", runtime.container_name]
      );
    }
    kubernetesService.destroy(
      runtime.deployment,
      runtime.namespace
    );
  }

  logs(runtime, follow = false) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        [
          "logs",
          "--tail",
          "200",
          runtime.container_name,
        ]
      );
    }
    kubernetesService.logs(
      runtime.pod,
      runtime.namespace,
      follow
    );

  }

  stats(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        [
          "stats",
          runtime.container_name,
          "--no-stream",
          "--format",
          "{{json .}}",
        ]
      );
    }
    kubernetesService.stats(
      runtime.pod,
      runtime.namespace
    );
  }
}

module.exports = new RuntimeActionService();