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

    return kubernetesService.restart(runtime.deployment);
  }

  stop(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        ["stop", runtime.container_name]
      );
    }

    return kubernetesService.stop(runtime.deployment);
  }

  start(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        ["start", runtime.container_name]
      );
    }

    return kubernetesService.start(runtime.deployment);
  }

  destroy(runtime) {
    if (runtime.engine === "docker") {
      return dockerService.execute(
        "docker",
        ["rm", "-f", runtime.container_name]
      );
    }

    return kubernetesService.destroy(runtime.deployment);
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

  return kubernetesService.logs(runtime.pod, follow);


    return kubernetesService.logs(runtime.pod);
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

    return kubernetesService.stats(runtime.pod);
  }
}

module.exports = new RuntimeActionService();