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
            const workloadName =
                `${buildPlan.projectName}-${deploymentId.substring(0, 8)}`;
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
                        workloadName,
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

            const pod = await kubectl.getPod(
                workloadName,
                buildPlan.namespace
            );

            if (!pod) {
                throw new Error(
                    `No READY pod found for ${buildPlan.projectName}`
                );
            }

            let service = null;

            if (buildPlan.type !== "worker") {
                service = await kubectl.getService(
                    workloadName,
                    buildPlan.namespace
                );
            }

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
                buildPlan.type === "worker"
                    ? "Worker pod is running successfully."
                    : "Application passed health checks."
            );

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
            const host =
                buildPlan.type === "frontend"
                    ? `${buildPlan.projectName}-${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}`
                    : null;

            return {
                deploymentId,

                project: buildPlan.projectName,

                engine: "kubernetes",

                url: host ? `http://${host}` : null,

                runtime: {
                    deploymentId,

                    name: buildPlan.projectName,

                    project: buildPlan.projectName,

                    type: buildPlan.type,

                    route: host ? `http://${host}` : null,

                    framework: buildPlan.framework,

                    imageName: buildPlan.imageName,

                    containerName: pod.metadata.name,

                    namespace: buildPlan.namespace,

                    deployment: workloadName,

                    service: service?.metadata?.name || null,

                    pod: pod.metadata.name,

                    branch: buildPlan.branch,

                    containerPort:
                        service?.spec?.ports?.[0]?.port ||
                        (buildPlan.type === "worker"
                            ? null
                            : buildPlan.containerPort) ||
                        null,

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