const fs = require("fs-extra");
const runtimeStatus = require("../runtime/runtime-status.service");
const dockerService = require("./docker.service");
const logger = require("../monitoring/logger.service");

class CleanupService {
  async success(workspace) {
    if (!workspace) return;

    // Keep workspace for debugging
    // await fs.remove(workspace.path);
  }

  /*
  ------------------------------------
  Runtime Cleanup
  ------------------------------------
  */

  async runtime(runtime) {
    logger.deployment(
      runtime.deploymentId,
      "⚠ Runtime cleanup skipped (debug mode).",
    );

    // await dockerService.removeContainer(runtime.containerName);
    // await dockerService.removeImage(runtime.imageName);
  }

  /*
  ------------------------------------
  Failed Deployment Cleanup
  ------------------------------------
  */

  async failed({
    workspace,
    containerName,
    imageName,
    deploymentId,
  }) {
    logger.deployment(
      deploymentId,
      "🧹 Cleanup skipped (debug mode).",
    );

    // Leave everything untouched for debugging

    // if (containerName) {
    //   await dockerService.removeContainer(containerName);
    // }

    // if (imageName) {
    //   await dockerService.removeImage(imageName);
    // }

    // if (workspace) {
    //   await fs.remove(workspace.path);
    // }

    runtimeStatus.publish(deploymentId, {
      type: "cleanup",
    });
  }
}

module.exports = new CleanupService();