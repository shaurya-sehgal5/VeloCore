const fs = require("fs-extra");
const runtimeStatus = require("../runtime/runtime-status.service");
const dockerService = require("./docker.service");
const logger = require("../monitoring/logger.service");

class CleanupService {
  async success(workspace) {
    if (!workspace) return;

    await fs.remove(workspace.path);
  }

  async runtime(runtime) {
    try {
      await dockerService.removeContainer(runtime.containerName);
    } catch {}

    try {
      await dockerService.removeImage(runtime.imageName);
    } catch {}
  }

  async failed({
    workspace,

    containerName,

    imageName,

    deploymentId,
  }) {
    logger.deployment(deploymentId, "🧹 Cleaning failed deployment...");

    try {
      if (containerName) {
        await dockerService.removeContainer(containerName);
      }
    } catch {}

    try {
      if (imageName) {
        await dockerService.removeImage(imageName);
      }
    } catch {}

    try {
      if (workspace) {
        await fs.remove(workspace.path);
      }
    } catch {}

    runtimeStatus.publish(deploymentId, {
      type: "cleanup",
    });
  }
}

module.exports = new CleanupService();
