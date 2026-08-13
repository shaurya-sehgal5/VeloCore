const { spawn } = require("child_process");
const logger = require("../../monitoring/logger.service");

class DockerRunner {

    run(
        args,
        options = {}
    ) {

        const {
            deploymentId = null,
            projectName = null,
            stage = "DOCKER"
        } = options;

        return new Promise(
            (resolve, reject) => {

                const docker =
                    spawn(
                        "docker",
                        [
                            "run",
                            "--rm",
                            ...args
                        ],
                        {
                            shell: false
                        }
                    );

                let stdout = "";
                let stderr = "";

                docker.stdout.on(
                    "data",
                    (data) => {

                        const text =
                            data.toString();

                        stdout += text;

                        if (
                            deploymentId
                        ) {

                            const lines =
                                text
                                    .split(/\r?\n/)
                                    .map(line =>
                                        line.trim()
                                    )
                                    .filter(Boolean);

                            for (
                                const line of lines
                            ) {

                                logger.detail(
                                    deploymentId,
                                    stage,
                                    "INFO",
                                    line,
                                    projectName
                                );
                            }
                        }
                    }
                );


                docker.stderr.on(
                    "data",
                    (data) => {

                        const text =
                            data.toString();

                        stderr += text;

                        if (
                            deploymentId
                        ) {

                            const lines =
                                text
                                    .split(/\r?\n/)
                                    .map(line =>
                                        line.trim()
                                    )
                                    .filter(Boolean);

                            for (
                                const line of lines
                            ) {

                                logger.detail(
                                    deploymentId,
                                    stage,
                                    "ERROR",
                                    line,
                                    projectName
                                );
                            }
                        }
                    }
                );

                docker.on(
                    "close",
                    (code) => {

                        resolve({
                            code,
                            stdout,
                            stderr
                        });

                    }
                );

                docker.on(
                    "error",
                    reject
                );
            }
        );
    }
}

module.exports =
    new DockerRunner();