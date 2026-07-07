const { spawn } = require("child_process");

const logger = require("./logger.service");
const statusService = require("./status.service");
const cleanupService = require("./cleanup.service");

class RuntimeMonitorService {

    monitor({

        deploymentId,

        containerName,

        imageName,

        workspace

    }) {

        const monitor = spawn(
            "docker",
            [
                "wait",
                containerName
            ]
        );

        monitor.stdout.on("data", async (data) => {

            const exitCode = parseInt(
                data.toString().trim()
            );

            logger.deployment(
                deploymentId,
                `⚠ Container exited with code ${exitCode}`
            );

            await statusService.update(
                deploymentId,
                "FAILED"
            );

            await cleanupService.failed({

                workspace,

                containerName,

                imageName,

                deploymentId

            });

        });

        monitor.stderr.on("data", data => {

            logger.deployment(
                deploymentId,
                data.toString().trim()
            );

        });

        monitor.on("error", err => {

            logger.deployment(
                deploymentId,
                err.message
            );

        });

    }

}

module.exports = new RuntimeMonitorService();