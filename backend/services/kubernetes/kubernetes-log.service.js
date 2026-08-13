const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");
const socket = require("./kubernetes-socket.service");

class KubernetesLogService {

  stream(
    pod,
    deploymentId,
    namespace = "default",
    projectName
  ) {

    const stream =
      kubectl.streamLogs(
        pod,
        namespace,
        deploymentId
      );

    stream.stdout.on(
      "data",
      async (data) => {

        const lines =
          data
            .toString()
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        for (const line of lines) {

          if (
            line.includes("kube-probe") ||
            line.includes("GET /health") ||
            line.includes("GET /ready") ||
            line.includes("GET /live") ||
            line.includes("127.0.0.1")
          ) {
            continue;
          }

          await logger.detail(
            deploymentId,
            "KUBERNETES",
            "INFO",
            line,
            projectName
          );

          socket.broadcast(
            "k8s:logs",
            {
              deploymentId,
              projectName,
              line,
            }
          );
        }
      }
    );

    stream.stderr.on(
      "data",
      async (data) => {

        const lines =
          data
            .toString()
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        for (const line of lines) {

          if (
            !line ||
            line.includes("kube-probe")
          ) {
            continue;
          }

          await logger.detail(
            deploymentId,
            "KUBERNETES",
            "ERROR",
            line,
            projectName
          );

          socket.broadcast(
            "k8s:logs",
            {
              deploymentId,
              projectName,
              line,
            }
          );
        }
      }
    );

    stream.on(
      "close",
      (code) => {

        if (code !== 0) {

          logger.warning(
            deploymentId,
            "KUBERNETES",
            `Runtime log stream closed with code ${code}`,
            projectName
          );
        }
      }
    );

    return stream;
  }
}

module.exports =
  new KubernetesLogService();