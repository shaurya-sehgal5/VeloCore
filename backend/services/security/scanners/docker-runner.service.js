const { spawn } = require("child_process");

class DockerRunner {

    run(args) {

        return new Promise((resolve, reject) => {

            const docker = spawn("docker", ["run", "--rm", ...args], {
                shell: false
            });

            let stdout = "";
            let stderr = "";

            docker.stdout.on("data", d => stdout += d.toString());

            docker.stderr.on("data", d => stderr += d.toString());

            docker.on("close", code => {

                resolve({
                    code,
                    stdout,
                    stderr
                });

            });

            docker.on("error", reject);

        });

    }

}

module.exports = new DockerRunner();