const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");
const socket = require("./kubernetes-socket.service");

class KubernetesLogService {
  stream(pod, deploymentId, namespace = "default") {
    logger.deployment(
      deploymentId,
      `📜 Streaming ${runtime.project || "runtime"} logs...`,
    );

    const stream = kubectl.streamLogs(pod, namespace);

    stream.stdout.on("data", (data) => {
      const line = data.toString().trim();

      logger.deployment(deploymentId, line);

      socket.broadcast("k8s:logs", {
        deploymentId,
        line,
      });
    });

    stream.stderr.on("data", (data) => {
      const line = data.toString().trim();

      logger.deployment(deploymentId, line);

      socket.broadcast("k8s:logs", {
        deploymentId,
        line,
      });
    });

    stream.on("close", (code) => {
      logger.deployment(
        deploymentId,
        `📦 Kubernetes log stream ended (${code})`,
      );
    });

    return stream;
  }
}

module.exports = new KubernetesLogService();