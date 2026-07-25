const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");
const kubernetesLogs = require("./kubernetes-log.service");
const namespaceService = require("./namespaces.service");
const metrics = require("../monitoring/metrics.service");
const portForwardService = require("./port-forward.service");
const fs = require("fs/promises");

class KubernetesDeployer {
    async deploy({
        deploymentId,
        buildPlan,
        manifest,
        rollback = false,
    }) {
        await logger.info(
            deploymentId,
            "KUBERNETES",
            "Applying manifest..."
        );

        await namespaceService.ensure(buildPlan.namespace);

        await kubectl.apply(manifest);

        await fs.unlink(manifest).catch(() => { });

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
                    buildPlan.namespace
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

        if (!pod) {
            throw new Error(
                `No READY pod found for ${buildPlan.projectName}`
            );
        }

        const localPort = await portForwardService.start(
            buildPlan.projectName,
            buildPlan.namespace,
            buildPlan.containerPort
        );

        await logger.success(
            deploymentId,
            "KUBERNETES",
            `Port forwarding started on localhost:${localPort}`
        );

        setImmediate(() => {
            const logStream = kubernetesLogs.stream(
                pod.metadata.name,
                deploymentId,
                buildPlan.namespace
            );

            logStream.on("error", (err) => {
                logger.error(
                    deploymentId,
                    "KUBERNETES",
                    `Log stream error: ${err.message}`
                );
            });
        });

        return {
            deploymentId,

            project: buildPlan.projectName,

            engine: "kubernetes",

            url: `http://localhost:8000/visit/${deploymentId}`,

            runtime: {
                deploymentId,

                name: buildPlan.projectName,

                project: buildPlan.projectName,

                type: buildPlan.type,

                framework: buildPlan.framework,

                imageName: buildPlan.imageName,

                containerName: pod.metadata.name,

                namespace: buildPlan.namespace,

                deployment: buildPlan.projectName,

                service: buildPlan.projectName,

                pod: pod.metadata.name,

                branch: buildPlan.branch,

                hostPort: localPort,

                containerPort:
                    service.spec.ports[0].port,

                slot: buildPlan.slot,

                engine: "kubernetes",
            },
        };
    }
}

module.exports = new KubernetesDeployer();