const { exec } = require("child_process");

class RuntimeMetricsService {
  async collect(containerName) {
    return new Promise((resolve) => {
      exec(
        `docker stats ${containerName} --no-stream --format "{{json .}}"`,
        (error, stdout) => {
          if (error || !stdout.trim()) {
            return resolve(null);
          }

          try {
            const stats = JSON.parse(stdout);

            resolve({
              cpu: stats.CPUPerc,
              memory: stats.MemUsage,
              memoryPercent: stats.MemPerc,
              network: stats.NetIO,
              blockIO: stats.BlockIO,
              pids: stats.PIDs,
            });
          } catch {
            resolve(null);
          }
        }
      );
    });
  }
}

module.exports = new RuntimeMetricsService();