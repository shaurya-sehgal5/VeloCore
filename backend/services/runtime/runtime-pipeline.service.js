
const runtimeLogService = require("./runtime-log.service");
const runtimeMonitorService = require("./runtime-monitor.service");
const healthService = require("../monitoring/health.service");
const statusService = require("../monitoring/status.service");
const logger = require("../monitoring/logger.service");

class RuntimePipeline {
  async start(runtime) {
    const {
      deploymentId,

      hostPort,

      containerName,

      imageName,

      containerPort,

      workspace,
    } = runtime;

    logger.deployment(deploymentId, "🚀 Runtime created.");

  
    
    await healthService.waitUntilHealthy({
      hostPort,
      deploymentId,
    });

 
    runtimeLogService.stream(containerName, deploymentId);

    runtimeMonitorService.monitor({
      deploymentId,

      containerName,

      imageName,

      workspace,
    });

    await statusService.update(deploymentId, "RUNNING");

    logger.deployment(deploymentId, "✅ Runtime Ready.");
  }
}

module.exports = new RuntimePipeline();
