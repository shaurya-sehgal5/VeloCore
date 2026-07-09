const registryService = require("../registry.service");
const runtimeLogService = require("../runtime-log.service");
const runtimeMonitorService = require("../runtime-monitor.service");
const healthService = require("../health.service");
const statusService = require("../status.service");
const logger = require("../logger.service");
const runtimeRegistry = require("./runtime-registry.service");

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

    runtimeRegistry.add(runtime);
    
    await healthService.waitUntilHealthy({
      hostPort,
      deploymentId,
    });

  await registryService.register({
    deploymentId,
    name: runtime.project,
    type: runtime.type,
    framework: runtime.framework,
    imageName,
    containerName,
    hostPort,
    containerPort,
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
