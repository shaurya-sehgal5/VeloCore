const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");

class KubernetesLogService {
  stream(pod, deploymentId, namespace = "default") {
    logger.deployment(
      deploymentId,
      "📜 Streaming Kubernetes logs..."
    );

    const stream = kubectl.streamLogs(
      pod,
      namespace,
    );

    stream.stdout.on("data", (data) => {
      logger.deployment(
        deploymentId,
        data.toString().trim(),
      );
    });

    stream.stderr.on("data", (data) => {
      logger.deployment(
        deploymentId,
        data.toString().trim(),
      );
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