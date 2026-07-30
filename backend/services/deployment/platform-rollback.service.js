const runtimeQuery = require("../runtime/runtime-query.service");
const builderService = require("../builder/builder.service");
const kubernetesService = require("../kubernetes/kubernetes.service");
const kubernetesDeployer = require("../kubernetes/kubernetes-deployer.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");
const deploymentEvents = require("../deployment/deployment-event.service");
const runtimeGroup = require("../runtime/runtime-group.service");
const kubectl = require("../kubernetes/kubectl.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const runtimeRegistry = require("../runtime/runtime-registry.service");

class PlatformRollbackService {
    async rollback(deploymentId) {
        await logger.warning(
            deploymentId,
            "ROLLBACK",
            "Deleting failed namespace"
        );

        // await kubectl.deleteNamespace(
        //     `velocore-${deploymentId}`
        // );
        const previous = await runtimeQuery.previousSuccessful(deploymentId);

        if (!previous) {
            throw new Error(
                "No previous successful deployment found."
            );
        }

        const runtimes =
            await runtimeQuery.previousRuntime(previous.id);

        if (!runtimes.length) {
            throw new Error(
                "Previous deployment has no runtime information."
            );
        }

        await logger.warning(
            deploymentId,
            "ROLLBACK",
            `Rolling back using deployment ${previous.id}`
        );
        const order = {
            backend: 1,
            worker: 2,
            frontend: 3,
        };

        runtimes.sort(
            (a, b) =>
                (order[a.type] || 99) -
                (order[b.type] || 99)
        );
        for (const runtime of runtimes) {
            const buildPlan =
                builderService.createRollbackPlan(runtime);
            await logger.info(
                deploymentId,
                "ROLLBACK",
                `Restoring ${runtime.name}`
            );
            const manifest =
                await kubernetesService.generate(buildPlan);

            const restored = await kubernetesDeployer.deploy({
                deploymentId,
                buildPlan,
                manifest,
                rollback: true,
            });

            runtimeGroup.add(deploymentId, restored);

            runtimeManager.register({
                ...restored.runtime,
                deploymentId,
            });

            await runtimeRegistry.register({
                ...restored.runtime,
                deploymentId,
            });
        }
        await deploymentEvents.emit({
            deploymentId,
            event: "ROLLBACK_COMPLETED",
            message: `Recovered using deployment ${previous.id}`,
        });
        await statusService.update(
            previous.id,
            "SUCCESS"
        );

        await statusService.update(
            deploymentId,
            "ROLLED_BACK"
        );
        return previous.id;
    }
}

module.exports = new PlatformRollbackService();