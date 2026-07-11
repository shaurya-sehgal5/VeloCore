const { spawn, exec } = require("child_process");
const runtimeStatus = require("./runtime-status.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");
const cleanupService = require("../docker/cleanup.service");
const runtimeManager = require("./runtime-manager.service");
const dockerMetrics = require("../monitoring/docker-metrics.service");

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
        `⚠ Container exited with code ${exitCode}`,
      );

      runtimeManager.remove(deploymentId);
      runtimeStatus.publish(deploymentId, {
        type: "runtime_exit",
        exitCode,
      });
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
        for (const runtime of runtimes) {
          try {
            const stats = await dockerMetrics.get(runtime.containerName);

            runtimeManager.update(
              runtime.deploymentId,
              runtime.project,
              runtime.slot,
              {
                metrics: {
                  cpu: stats.CPUPerc,
                  memory: stats.MemUsage,
                  memoryPercent: stats.MemPerc,
                  network: stats.NetIO,
                  blockIO: stats.BlockIO,
                  pids: stats.PIDs,
                  uptime: Math.floor((Date.now() - runtime.startedAt) / 1000),
                },
              },
            );
          } catch (err) {
            logger.deployment(
              runtime.deploymentId,
              `Metrics Error: ${err.message}`,
            );
          }
        }

      }
    }, interval);
  }
}

module.exports = new RuntimeMonitorService();
