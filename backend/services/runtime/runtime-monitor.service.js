const { spawn } = require("child_process");
const runtimeStatus = require("./runtime-status.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");
const cleanupService = require("../docker/cleanup.service");
const runtimeManager = require("./runtime-manager.service");
const metrics = require("../monitoring/metrics.service");
const runtimeAdapter = require("./runtime-adapter.service");
const deploymentMetrics = require("../monitoring/deployment-metadata.service");


function memoryToBytes(memory) {
  const value = memory.split("/")[0].trim();

  const number = parseFloat(value);

  if (value.endsWith("KiB")) return number * 1024;
  if (value.endsWith("MiB")) return number * 1024 * 1024;
  if (value.endsWith("GiB")) return number * 1024 * 1024 * 1024;

  return number;
}

function networkToBytes(value) {
  const number = parseFloat(value);

  if (value.endsWith("kB")) return number * 1000;
  if (value.endsWith("MB")) return number * 1000000;
  if (value.endsWith("GB")) return number * 1000000000;

  return number;
}

class RuntimeMonitorService {
  constructor() {
    this.metricInterval = null;
  }

  /*
  ------------------------------------
  Exit Monitor
  ------------------------------------
  */

  monitor({
    deploymentId,
    project,
    slot,
    containerName,
    imageName,
    workspace,
    engine,
  }) {
    if (engine === "kubernetes") {
      logger.info(
        deploymentId,
        "RUNTIME",
        "Kubernetes runtime monitoring enabled."
      );
      return;
    }

    const monitor = spawn("docker", ["wait", containerName]);

    monitor.stdout.on("data", async (data) => {
      const exitCode = parseInt(data.toString().trim());

      await logger.warning(
        deploymentId,
        "RUNTIME",
        `Container exited with code ${exitCode}`
      );

      runtimeManager.remove(deploymentId, project, slot);
      runtimeStatus.publish(deploymentId, {
        type: "runtime_exit",
        exitCode,
      });
      await statusService.update(deploymentId, "FAILED");
      metrics.deploymentStatus
        .labels(
          deploymentId,
          project,
          runtime.namespace || "docker"
        )
        .set(0);
      await cleanupService.failed({
        workspace,
        containerName,
        imageName,
        deploymentId,
      });
    });

    monitor.stderr.on("data", (data) => {
      logger.error(
        deploymentId,
        "RUNTIME",
        data.toString().trim()
      );
    });

    monitor.on("error", (err) => {
      logger.error(
        deploymentId,
        "RUNTIME",
        err.message
      );
    });
  }

  /*
  ------------------------------------
  Runtime Metrics
  ------------------------------------
  */

  start(interval = 5000) {
    if (this.metricInterval) return;

    this.metricInterval = setInterval(async () => {
      const runtimes = runtimeManager.list();

      for (const runtime of runtimes) {
        try {
          const stats = await runtimeAdapter.metrics(runtime);

          runtimeManager.update(
            runtime.deploymentId,
            runtime.project,
            runtime.slot,
            {
              metrics:
                runtime.engine === "docker"
                  ? {
                    cpu: stats.CPUPerc,
                    memory: stats.MemUsage,
                    memoryPercent: stats.MemPerc,
                    network: stats.NetIO,
                    blockIO: stats.BlockIO,
                    pids: stats.PIDs,
                    uptime: Math.floor(
                      (Date.now() - runtime.startedAt) / 1000,
                    ),
                  }
                  : {
                    cpu: stats.cpu,
                    memory: stats.memory,
                    uptime: Math.floor(
                      (Date.now() - runtime.startedAt) / 1000,
                    ),
                  },
            },
          );

          if (runtime.engine === "docker") {
            metrics.containerCpu
              .labels(runtime.deploymentId, runtime.project)
              .set(parseFloat(stats.CPUPerc));

            metrics.containerPids
              .labels(runtime.deploymentId, runtime.project)
              .set(parseInt(stats.PIDs));

            metrics.containerMemory
              .labels(runtime.deploymentId, runtime.project)
              .set(memoryToBytes(stats.MemUsage));

            const [rx, tx] = stats.NetIO.split("/").map((v) => v.trim());

            metrics.containerNetworkRx
              .labels(runtime.deploymentId, runtime.project)
              .set(networkToBytes(rx));

            metrics.containerNetworkTx
              .labels(runtime.deploymentId, runtime.project)
              .set(networkToBytes(tx));
            metrics.deploymentStatus
              .labels(
                runtime.deploymentId,
                runtime.project,
                runtime.namespace || "docker"
              )
              .set(1);

            metrics.deploymentUptime
              .labels(
                runtime.deploymentId,
                runtime.project,
                runtime.namespace || "docker"
              )
              .set(
                Math.floor(
                  (Date.now() - runtime.startedAt) / 1000
                )
              );

            metrics.deploymentRestarts
              .labels(
                runtime.deploymentId,
                runtime.project,
                runtime.namespace || "docker"
              )
              .set(runtime.restartCount || 0);
          }
          if (runtime.engine === "kubernetes") {
            metrics.containerCpu
              .labels(runtime.deploymentId, runtime.project)
              .set(stats.cpu);

            metrics.containerMemory
              .labels(runtime.deploymentId, runtime.project)
              .set(stats.memory);

            metrics.deploymentStatus
              .labels(
                runtime.deploymentId,
                runtime.project,
                runtime.namespace
              )
              .set(stats.status === "Running" ? 1 : 0);

            metrics.deploymentRestarts
              .labels(
                runtime.deploymentId,
                runtime.project,
                runtime.namespace
              )
              .set(stats.restarts);

            metrics.deploymentUptime
              .labels(
                runtime.deploymentId,
                runtime.project,
                runtime.namespace
              )
              .set(
                Math.floor(
                  (Date.now() - runtime.startedAt) / 1000
                )
              );

            deploymentMetrics.deploymentInfo
              .labels(
                runtime.deploymentId,
                runtime.project,
                runtime.namespace,
                stats.pod,
                stats.node,
                runtime.service,
                stats.image,
                runtime.engine,
                runtime.framework || "unknown",
                runtime.branch || "main"
              )
              .set(1);

            deploymentMetrics.deploymentReplicas
              .labels(
                runtime.deploymentId,
                runtime.namespace
              )
              .set(stats.replicas);

            deploymentMetrics.deploymentReadyReplicas
              .labels(
                runtime.deploymentId,
                runtime.namespace
              )
              .set(stats.readyReplicas);

            deploymentMetrics.deploymentContainerStatus
              .labels(
                runtime.deploymentId,
                runtime.namespace
              )
              .set(stats.ready ? 1 : 0);
          }
        } catch (err) {
          logger.error(
            runtime.deploymentId,
            "RUNTIME",
            `Metrics Error: ${err.message}`
          );
        }
      }
    }, interval);
  }
}

module.exports = new RuntimeMonitorService();
