const { exec } = require("child_process");

class KubernetesMetricsService {
  async get(pod, namespace = "default", deployment = null) {
    return new Promise((resolve) => {

      exec(
        `kubectl top pod ${pod} -n ${namespace} --no-headers`,
        (err, stdout) => {

          let cpu = 0;
          let memory = 0;

          if (!err && stdout.trim()) {
            const top = stdout.trim().split(/\s+/);

            cpu = parseInt(top[1]) || 0;
            memory = parseInt(top[2]) || 0;
          }

          exec(
            `kubectl get pod ${pod} -n ${namespace} -o json`,
            (err2, stdout2) => {

              if (err2) {
                return resolve({
                  cpu,
                  memory,
                });
              }

              const podInfo = JSON.parse(stdout2);

              exec(
                `kubectl get deployment ${deployment} -n ${namespace} -o json`,
                (err3, stdout3) => {

                  let replicas = 1;
                  let readyReplicas = 1;

                  if (!err3 && stdout3) {
                    const deploy = JSON.parse(stdout3);

                    replicas =
                      deploy.status.replicas || 0;

                    readyReplicas =
                      deploy.status.readyReplicas || 0;
                  }

                  resolve({
                    cpu,
                    memory,

                    pod,

                    namespace,

                    node: podInfo.spec.nodeName,

                    image: podInfo.spec.containers[0].image,

                    container: podInfo.spec.containers[0].name,

                    status: podInfo.status.phase,

                    restarts:
                      podInfo.status.containerStatuses?.[0]
                        ?.restartCount || 0,

                    ready:
                      podInfo.status.containerStatuses?.[0]
                        ?.ready || false,

                    replicas,

                    readyReplicas,

                    createdAt:
                      podInfo.metadata.creationTimestamp
                  });

                }
              );

            }
          );

        }
      );

    });
  }
}

module.exports = new KubernetesMetricsService();