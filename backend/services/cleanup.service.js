const fs = require("fs-extra");

const dockerService = require("./docker.service");
const logger = require("./logger.service");

class CleanupService {

    async success(workspace) {

        if (!workspace) return;

        await fs.remove(workspace.path);

    }

    async failed({

        workspace,

        containerName,

        imageName,

        deploymentId

    }) {

        logger.deployment(
            deploymentId,
            "🧹 Cleaning failed deployment..."
        );

        try {

            if (containerName) {

                await dockerService.removeContainer(
                    containerName
                );

            }

        } catch {}

        try {

            if (imageName) {

                await dockerService.removeImage(
                    imageName
                );

            }

        } catch {}

        try {

            if (workspace) {

                await fs.remove(
                    workspace.path
                );

            }

        } catch {}

    }

}

module.exports = new CleanupService();