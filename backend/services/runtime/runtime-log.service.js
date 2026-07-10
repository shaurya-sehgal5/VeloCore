const { spawn } = require("child_process");
const logger = require("../monitoring/logger.service");

class RuntimeLogService {

    stream(containerName, deploymentId) {

        logger.deployment(
            deploymentId,
            "📜 Streaming container logs..."
        );

        const logs = spawn(
            "docker",
            [
                "logs",
                "-f",
                containerName
            ]
        );

        logs.stdout.on("data", data => {

            logger.deployment(
                deploymentId,
                data.toString().trim()
            );

        });

        logs.stderr.on("data", data => {

            logger.deployment(
                deploymentId,
                data.toString().trim()
            );

        });

        logs.on("error", err => {

            logger.deployment(
                deploymentId,
                err.message
            );

        });

        logs.on("close", code => {

            logger.deployment(
                deploymentId,
                `📦 Log stream ended (exit ${code})`
            );

        });

        return logs;

    }

}

module.exports = new RuntimeLogService();