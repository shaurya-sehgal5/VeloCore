const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

const logger = require("../monitoring/logger.service");

class HelmService {

    async install({
        deploymentId,
        buildPlan
    }) {

        const valuesPath = path.join(
            __dirname,
            "../../helm/values.generated.yaml"
        );

        await logger.info(
            deploymentId,
            "HELM",
            "Generating Helm values..."
        );

        const values = `
deploymentId: ${buildPlan.projectName}

namespace: ${buildPlan.namespace}

slot: ${buildPlan.slot}

image:
  repository: ${buildPlan.imageName}

container:
  port: ${buildPlan.containerPort}

service:
  type: ClusterIP
  port: ${buildPlan.containerPort}

ingress:
  enabled: true
  className: nginx
  path: /apps/${deploymentId}

resources: {}

        `;

        await fs.writeFile(valuesPath, values);

        await logger.info(
            deploymentId,
            "HELM",
            "Installing Helm chart..."
        );

        return this.execute([
            "upgrade",
            "--install",
            deploymentId,
            path.join(__dirname, "../../helm"),
            "-f",
            valuesPath,
            "-n",
            buildPlan.namespace,
            "--create-namespace"
        ], deploymentId);
    }

    execute(args, deploymentId) {

        return new Promise((resolve, reject) => {

            const helm = spawn("helm", args, {
                shell: true
            });

            let stdout = "";
            let stderr = "";

            helm.stdout.on("data", data => {
                stdout += data.toString();
            });

            helm.stderr.on("data", data => {
                stderr += data.toString();
            });

            helm.on("close", code => {

                if (code !== 0) {
                    return reject(new Error(stderr));
                }

                if (stdout.trim()) {

                    logger.success(
                        deploymentId,
                        "HELM",
                        "Helm release installed."
                    );

                }

                resolve(stdout);

            });

            helm.on("error", reject);

        });

    }
    async rollback(releaseName, namespace, revision) {

        return this.execute([
            "rollback",
            releaseName,
            revision.toString(),
            "-n",
            namespace
        ]);

    }
    async history(releaseName, namespace) {

        const output = await this.execute([
            "history",
            releaseName,
            "-n",
            namespace,
            "-o",
            "json"
        ]);

        return JSON.parse(output);

    }
    async rollbackPrevious(releaseName, namespace) {

        const history = await this.history(
            releaseName,
            namespace
        );

        if (history.length < 2)
            throw new Error("No previous revision.");

        const previous =
            history[history.length - 2];

        return this.rollback(
            releaseName,
            namespace,
            previous.revision
        );

    }

}

module.exports = new HelmService();