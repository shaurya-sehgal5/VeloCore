const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");
const socket = require("./kubernetes-socket.service");

class KubernetesLogService {
  stream(pod, deploymentId, namespace = "default") {

    logger.info(
      deploymentId,
      "KUBERNETES",
      `Streaming logs from ${pod}`
    );

    const stream = kubectl.streamLogs(pod, namespace);

    stream.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (
        !line ||
        line.includes("kube-probe")
      ) {
        return;
      }
      logger.live(
        deploymentId,
        "KUBERNETES",
        "INFO",
        line
      );
      socket.broadcast("k8s:logs", {
        deploymentId,
        line,
      });
    });

    stream.stderr.on("data", (data) => {
      const line = data.toString().trim();
      if (
        !line ||
        line.includes("kube-probe")
      ) {
        return;
      }
      logger.live(
        deploymentId,
        "KUBERNETES",
        "ERROR",
        line
      );
      socket.broadcast("k8s:logs", {
        deploymentId,
        line,
      });
    });

    stream.on("close", (code) => {
      logger.info(
        deploymentId,
        "KUBERNETES",
        `Log stream closed (${code})`
      );
    });

    return stream;
  }
}

module.exports = new KubernetesLogService();