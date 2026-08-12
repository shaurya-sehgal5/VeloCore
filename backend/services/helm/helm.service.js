const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const config = require("../../config/env");
const logger = require("../monitoring/logger.service");

class HelmService {
    async install({ deploymentId, buildPlan }) {
        const valuesPath = path.join(
            __dirname,
            `../../helm/${buildPlan.projectName}-${deploymentId}.values.yaml`
        );

        await logger.info(
            deploymentId,
            "HELM",
            "Generating Helm values..."
        );

        const env = {};

        if (buildPlan.type === "backend") {
            env.PORT = String(buildPlan.containerPort);
            env.NODE_ENV = "production";
        }

        if (buildPlan.type === "frontend") {
            env.NODE_ENV = "production";
        }

        if (buildPlan.type === "worker") {
            env.NODE_ENV = "production";

            if (buildPlan.redisHost) {
                env.REDIS_HOST = buildPlan.redisHost;
            }

            if (buildPlan.redisPort) {
                env.REDIS_PORT = String(
                    buildPlan.redisPort
                );
            }
        }

        const isWorker = buildPlan.type === "worker";
        const isFrontend = buildPlan.type === "frontend";
        const healthCheck =
            buildPlan.type === "worker"
                ? {
                    enabled: false,
                    path: ""
                }
                : buildPlan.healthCheck
                    ? {
                        enabled: true,
                        path: buildPlan.healthCheck.path
                    }
                    : {
                        enabled: false,
                        path: ""
                    };
        const values = `
deploymentId: ${buildPlan.projectName}-${deploymentId.substring(0, 8)}

namespace: ${buildPlan.namespace}

slot: ${buildPlan.slot}

type: ${buildPlan.type}

framework: ${buildPlan.framework}

replicas: ${buildPlan.replicas || 1}

image:
  repository: ${buildPlan.imageName}

container:
  port: ${buildPlan.containerPort || 0}

service:
  enabled: ${!isWorker}
  type: ClusterIP
  port: ${buildPlan.containerPort || 0}

ingress:
  enabled: ${isFrontend}
  className: traefik
  host: ${buildPlan.projectName}-${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}

env:
${Object.entries(env)
                .map(([key, value]) => `  ${key}: "${value}"`)
                .join("\n")}

healthCheck:
  enabled: ${healthCheck.enabled}
  path: "${healthCheck.path}"

resources: {}
`;

        await fs.writeFile(valuesPath, values);

        await logger.info(
            deploymentId,
            "HELM",
            "Installing Helm chart..."
        );

        return this.execute(
            [
                "upgrade",
                "--install",
                `${buildPlan.projectName}-${deploymentId.substring(0, 8)}`,
                path.join(__dirname, "../../helm"),
                "-f",
                valuesPath,
                "-n",
                buildPlan.namespace,
                "--create-namespace",
            ],
            deploymentId
        );
    }

    execute(args, deploymentId) {
        return new Promise((resolve, reject) => {
            const helm = spawn("helm", args, {
                shell: true,
            });

            let stdout = "";
            let stderr = "";

            helm.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            helm.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            helm.on("close", (code) => {
                if (code !== 0) {
                    return reject(new Error(stderr));
                }

                if (stdout.trim()) {
                    logger.success(
                        deploymentId,
                        "HELM",
                        stdout.trim()
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
            namespace,
        ]);
    }

    async history(releaseName, namespace) {
        const output = await this.execute([
            "history",
            releaseName,
            "-n",
            namespace,
            "-o",
            "json",
        ]);

        return JSON.parse(output);
    }

    async rollbackPrevious(releaseName, namespace) {
        const history = await this.history(
            releaseName,
            namespace
        );

        if (history.length < 2) {
            throw new Error("No previous revision.");
        }

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