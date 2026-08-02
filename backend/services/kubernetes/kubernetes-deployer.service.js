const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");
const kubernetesLogs = require("./kubernetes-log.service");
const namespaceService = require("./namespaces.service");
const metrics = require("../monitoring/metrics.service");
const helm = require("../helm/helm.service");
const analyzer = require("./failure-analyzer.service");
const config = require("../../config/env")
const kubernetesMetrics = require("../monitoring/kubernetes-metrics.service");

class KubernetesDeployer {
    async deploy({
        deploymentId,
        buildPlan,
        rollback = false,
    }) {
        try {
            await logger.info(
                deploymentId,
                "HELM",
                "Deploying Helm release..."
            );
            await namespaceService.ensure(buildPlan.namespace);
            try {
                await helm.install({
                    deploymentId,
                    buildPlan
                });
            } catch (error) {
                await logger.error(
                    deploymentId,
                    "ROLLBACK",
                    "Deployment failed. Rolling back..."
                );
                try {
                    await helm.rollbackPrevious(
                        deploymentId,
                        buildPlan.namespace
                    );
                    await logger.info(
                        deploymentId,
                        "ROLLBACK",
                        "Rollback completed."
                    );
                } catch (rollbackError) {
                    await logger.error(
                        deploymentId,
                        "ROLLBACK",
                        rollbackError.message
                    );
                }
                throw error;
            }
            await logger.info(
                deploymentId,
                "KUBERNETES",
                "Waiting for rollout..."
            );

            const rolloutStart = Date.now();

            try {

                try {

                    await kubectl.rollout(
                        buildPlan.projectName,
                        buildPlan.namespace,
                        deploymentId,
                    );

                } catch (err) {

                    if (rollback) {

                        throw new Error(
                            `Rollback deployment failed: ${err.message}`
                        );

                    }

                    throw err;

                }

            } finally {

                metrics.rolloutDuration.observe(
                    (Date.now() - rolloutStart) / 1000
                );

            }

            const [pod, service] = await Promise.all([
                kubectl.getPod(
                    buildPlan.projectName,
                    buildPlan.namespace
                ),
                kubectl.getService(
                    buildPlan.projectName,
                    buildPlan.namespace
                ),
            ]);

            const info = await kubernetesMetrics.get(
                pod.metadata.name,
                buildPlan.namespace,
                buildPlan.projectName
            );

            metrics.containerCpu.labels(
                 deploymentId,
                buildPlan.projectName
            ).set(info.cpu);

            metrics.containerMemory.labels(
                 deploymentId,
                buildPlan.projectName
            ).set(info.memory);

            metrics.deploymentRestarts.labels(
                 deploymentId,
                buildPlan.projectName,
                buildPlan.namespace
            ).set(info.restarts);

            metrics.deploymentStatus.labels(
                 deploymentId,
                buildPlan.projectName,
                buildPlan.namespace
            ).set(1);
            await logger.success(
                deploymentId,
                "HEALTH",
                "Application passed health checks."
            );

            if (!pod) {

                throw new Error(
                    `No READY pod found for ${buildPlan.projectName}`
                );

            }

            setImmediate(() => {
                try {
                    const logStream = kubernetesLogs.stream(
                        pod.metadata.name,
                        deploymentId,
                        buildPlan.namespace
                    );

                    logStream.on("error", (err) => {
                        logger.error(
                            deploymentId,
                            "KUBERNETES",
                            err.message
                        );
                    });
                } catch (err) {
                    logger.warning(
                        deploymentId,
                        "KUBERNETES",
                        `Unable to stream logs: ${err.message}`
                    );
                }
            });

            return {

                deploymentId,

                project: buildPlan.projectName,

                engine: "kubernetes",

                url: `http://${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}`,

                runtime: {

                    deploymentId,

                    name: buildPlan.projectName,

                    project: buildPlan.projectName,

                    type: buildPlan.type,

                    route: `http://${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}`,

                    framework: buildPlan.framework,

                    imageName: buildPlan.imageName,

                    containerName: pod.metadata.name,

                    namespace: buildPlan.namespace,

                    deployment: buildPlan.projectName,

                    service: buildPlan.projectName,

                    pod: pod.metadata.name,

                    branch: buildPlan.branch,

                    containerPort: service.spec.ports[0].port,

                    slot: buildPlan.slot,

                    engine: "kubernetes",

                },

            };

        } catch (error) {

            const failure = analyzer.analyze(error.message);

            if (failure) {

                await logger.error(
                    deploymentId,
                    "FAILURE",
                    `${failure.code}: ${failure.reason}`
                );

                await logger.warning(
                    deploymentId,
                    "SUGGESTION",
                    failure.suggestion
                );

            } else {

                await logger.error(
                    deploymentId,
                    "FAILURE",
                    error.message
                );

            }

            throw error;

        }

    }
}

module.exports = new KubernetesDeployer();