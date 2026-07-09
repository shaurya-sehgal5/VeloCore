const { spawn, exec } = require("child_process");

const logger = require("./logger.service");
const statusService = require("./status.service");
const cleanupService = require("./cleanup.service");
const runtimeManager = require("./runtime-manager.service");

class RuntimeMonitorService {
  constructor() {
    this.metricInterval = null;
  }

  /*
  ------------------------------------
  Exit Monitor
  ------------------------------------
  */

  monitor({ deploymentId, containerName, imageName, workspace }) {
    const monitor = spawn("docker", ["wait", containerName]);

    monitor.stdout.on("data", async (data) => {
      const exitCode = parseInt(data.toString().trim());

      logger.deployment(
        deploymentId,
        `⚠ Container exited with code ${exitCode}`
      );

      runtimeManager.remove(deploymentId);

      await statusService.update(deploymentId, "FAILED");

      await cleanupService.failed({
        workspace,
        containerName,
        imageName,
        deploymentId,
      });
    });

    monitor.stderr.on("data", (data) => {
      logger.deployment(deploymentId, data.toString().trim());
    });

    monitor.on("error", (err) => {
      logger.deployment(deploymentId, err.message);
    });
  }

  /*
  ------------------------------------
  Runtime Metrics
  ------------------------------------
  */

  start(interval = 60000) {
    if (this.metricInterval) return;

    this.metricInterval = setInterval(async () => {
      const runtimes = runtimeManager.list();

      for (const runtime of runtimes) {
        exec(
          `docker stats ${runtime.containerName} --no-stream --format "{{json .}}"`,
          (err, stdout) => {
            if (err || !stdout.trim()) return;

            try {
              const stats = JSON.parse(stdout);

              runtimeManager.update(runtime.deploymentId, {
                metrics: {
                  cpu: stats.CPUPerc,
                  memory: stats.MemUsage,
                  memoryPercent: stats.MemPerc,
                  network: stats.NetIO,
                  blockIO: stats.BlockIO,
                  pids: stats.PIDs,
                },
                lastMetricsUpdate: Date.now(),
              });
            } catch {}
          }
        );
      }
    }, interval);
  }
}

module.exports = new RuntimeMonitorService();