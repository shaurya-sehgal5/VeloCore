const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");
const socket = require("./kubernetes-socket.service");

class KubernetesLogService {
  stream(pod, deploymentId, namespace = "default") {

    const stream = kubectl.streamLogs(pod, namespace);

    stream.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (
        !line ||

        line.includes("kube-probe") ||

        line.includes("GET /health") ||

        line.includes("GET /ready") ||

        line.includes("GET /live") ||

        line.includes("127.0.0.1") ||

        line.includes("Listening on") ||

        line.includes("Server started") ||

        line.includes("Application started") ||

        line.includes("Ready in")
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
     
    });

    return stream;
  }
}

module.exports = new KubernetesLogService();