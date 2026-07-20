
const runtimeLogService = require("./runtime-log.service");
const runtimeMonitorService = require("./runtime-monitor.service");
const healthService = require("../monitoring/health.service");
const statusService = require("../monitoring/status.service");
const logger = require("../monitoring/logger.service");

class RuntimePipeline {
    async start(runtime) {

        const {
            deploymentId,
            containerName,
            imageName,
            workspace,
        } = runtime;

        await logger.success(
            deploymentId,
            "RUNTIME",
            "Runtime created."
        );

        setImmediate(() => {
            runtimeLogService.stream(runtime, deploymentId);
        });

        if (runtime.engine !== "kubernetes") {
            runtimeMonitorService.monitor({
                deploymentId,
                containerName,
                imageName,
                workspace,
                engine: runtime.engine,
            });
        }
        await statusService.update(deploymentId, "RUNNING");

        await logger.success(
            deploymentId,
            "RUNTIME",
            "Runtime ready."
        );
    }
}

module.exports = new RuntimePipeline();
