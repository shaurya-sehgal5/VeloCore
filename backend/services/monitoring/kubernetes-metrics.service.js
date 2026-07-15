const { exec } = require("child_process");

class KubernetesMetricsService {
  async get(pod) {
    return new Promise((resolve) => {
      exec(
        `kubectl top pod ${pod} --no-headers`,
        (err, stdout) => {
          if (err) {
            return resolve({
              cpu: "0m",
              memory: "0Mi",
            });
          }

          const line = stdout.trim();

          if (!line) {
            return resolve({
              cpu: "0m",
              memory: "0Mi",
            });
          }

          const parts = line.split(/\s+/);

          resolve({
            cpu: parts[1] || "0m",
            memory: parts[2] || "0Mi",
          });
        }
      );
    });
  }
}

module.exports = new KubernetesMetricsService();