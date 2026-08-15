const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const config = require("../../config/env");
const logger = require("../monitoring/logger.service");

class HelmService {

    async install({
        deploymentId,
        buildPlan,
        env: userEnv = {},
    }) {

        const shortId =
            deploymentId.substring(0, 8);

        const workloadName =
            `${buildPlan.projectName}-${shortId}`;

        const valuesPath =
            path.join(
                __dirname,
                `../../helm/${workloadName}.values.yaml`
            );

        await logger.info(
            deploymentId,
            "HELM",
            `Generating values for ${buildPlan.projectName}`,
            buildPlan.projectName
        );

        const env = {
            NODE_ENV: "production",
            ...userEnv,
        };

        /*
        ----------------------------------------
        Backend
        ----------------------------------------
        */

        if (
            buildPlan.type === "backend"
        ) {

            env.PORT =
                String(
                    buildPlan.containerPort ||
                    8080
                );

            if (
                buildPlan.postgres?.enabled
            ) {

                env.DATABASE_URL =
                    `postgresql://${buildPlan.postgres.user}:` +
                    `${buildPlan.postgres.password}@` +
                    `${buildPlan.postgres.service}:5432/` +
                    `${buildPlan.postgres.database}`;
            }

            if (buildPlan.redisHost) {

                env.REDIS_URL =
                    `redis://${buildPlan.redisHost}:` +
                    `${buildPlan.redisPort || 6379}/0`;
            }
        }

        /*
        ----------------------------------------
        Frontend
        ----------------------------------------
        */

        if (
            buildPlan.type === "frontend"
        ) {

            env.NODE_ENV =
                "production";

            if (
                buildPlan.backendServiceName
            ) {

                env.BACKEND_HOST =
                    buildPlan.backendServiceName;

                env.BACKEND_PORT =
                    String(
                        buildPlan.backendPort ||
                        8080
                    );
            }
        }

        /*
        ----------------------------------------
        Worker
        ----------------------------------------
        */

        if (
            buildPlan.type === "worker"
        ) {

            if (buildPlan.redisHost) {
                env.REDIS_HOST =
                    buildPlan.redisHost;
            }

            if (buildPlan.redisPort) {
                env.REDIS_PORT =
                    String(
                        buildPlan.redisPort
                    );
            }
        }

        const isWorker =
            buildPlan.type === "worker";

        const isFrontend =
            buildPlan.type === "frontend";

        const healthCheck =
            buildPlan.type === "worker"
                ? {
                    enabled: false,
                    path: "",
                }
                : buildPlan.healthCheck
                    ? {
                        enabled: true,
                        path:
                            buildPlan.healthCheck.path ||
                            "/",
                    }
                    : {
                        enabled: false,
                        path: "",
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

backend:
  enabled: ${Boolean(buildPlan.backendServiceName)}
  serviceName: ${buildPlan.backendServiceName || ""}
  servicePort: ${buildPlan.backendPort || 0}

ingress:
  enabled: ${isFrontend}
  className: traefik
  host: ${buildPlan.projectName}-${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}

env:
${Object.entries(env)
                .map(
                    ([key, value]) =>
                        `  ${key}: "${value}"`
                )
                .join("\n")}

healthCheck:
  enabled: ${healthCheck.enabled}
  path: "${healthCheck.path}"

resources: {}
`;

        await fs.writeFile(
            valuesPath,
            values
        );

        await logger.success(
            deploymentId,
            "HELM",
            `Values generated for ${buildPlan.projectName}`,
            buildPlan.projectName
        );

        await logger.info(
            deploymentId,
            "HELM",
            `Installing ${workloadName}`,
            buildPlan.projectName
        );

        return this.execute(
            [
                "upgrade",
                "--install",
                workloadName,
                path.join(
                    __dirname,
                    "../../helm"
                ),
                "-f",
                valuesPath,
                "-n",
                buildPlan.namespace,
                "--create-namespace",
                "--wait",
                "--timeout",
                "5m",
            ],
            deploymentId
        );
    }

    /*
    ==================================================
    HELM COMMAND
    ==================================================
    */

    execute(
        args,
        deploymentId = null
    ) {

        return new Promise(
            (resolve, reject) => {

                const helm =
                    spawn(
                        "helm",
                        args,
                        {
                            shell: false,
                        }
                    );

                let stdout = "";
                let stderr = "";

                /*
                ------------------------------------------
                RAW STDOUT
                ------------------------------------------
                */

                helm.stdout.on(
                    "data",
                    (data) => {

                        const text =
                            data.toString();

                        stdout += text;

                        if (deploymentId) {

                            const lines =
                                text
                                    .split(/\r?\n/)
                                    .map((line) =>
                                        line.trim()
                                    )
                                    .filter(Boolean);

                        }
                    }
                );

                /*
                ------------------------------------------
                RAW STDERR
                ------------------------------------------
                */

                helm.stderr.on(
                    "data",
                    (data) => {

                        const text =
                            data.toString();

                        stderr += text;

                        if (deploymentId) {

                            const lines =
                                text
                                    .split(/\r?\n/)
                                    .map((line) =>
                                        line.trim()
                                    )
                                    .filter(Boolean);
                        }
                    }
                );

                helm.on(
                    "close",
                    async (code) => {

                        if (code !== 0) {

                            return reject(
                                new Error(
                                    stderr.trim() ||
                                    stdout.trim() ||
                                    `Helm exited with code ${code}`
                                )
                            );
                        }

                        /*
                        --------------------------------------
                        DO NOT put raw Helm stdout into
                        normal logs.
                        --------------------------------------
                        */

                        resolve(stdout);
                    }
                );

                helm.on(
                    "error",
                    reject
                );
            }
        );
    }

    async rollback(
        releaseName,
        namespace,
        revision,
        deploymentId = null
    ) {

        return this.execute(
            [
                "rollback",
                releaseName,
                revision.toString(),
                "-n",
                namespace,
            ],
            deploymentId
        );
    }

    async history(
        releaseName,
        namespace,
        deploymentId = null
    ) {

        const output =
            await this.execute(
                [
                    "history",
                    releaseName,
                    "-n",
                    namespace,
                    "-o",
                    "json",
                ],
                deploymentId
            );

        return JSON.parse(output);
    }

    async rollbackPrevious(
        releaseName,
        namespace,
        deploymentId = null
    ) {

        const history =
            await this.history(
                releaseName,
                namespace,
                deploymentId
            );

        if (history.length < 2) {
            throw new Error(
                "No previous revision."
            );
        }

        const previous =
            history[
            history.length - 2
            ];

        return this.rollback(
            releaseName,
            namespace,
            previous.revision,
            deploymentId
        );
    }
}

module.exports =
    new HelmService();