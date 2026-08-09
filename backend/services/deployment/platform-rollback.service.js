const runtimeQuery = require("../runtime/runtime-query.service");
const builderService = require("../builder/builder.service");
const kubernetesDeployer = require("../kubernetes/kubernetes-deployer.service");
const logger = require("../monitoring/logger.service");
const statusService = require("../monitoring/status.service");
const deploymentEvents = require("../deployment/deployment-event.service");
const runtimeGroup = require("../runtime/runtime-group.service");
const runtimeManager = require("../runtime/runtime-manager.service");
const runtimeRegistry = require("../runtime/runtime-registry.service");
const db = require("../../config/db");

class PlatformRollbackService {
    async rollback(deploymentId) {
        await logger.warning(
            deploymentId,
            "ROLLBACK",
            "Deleting failed namespace"
        );

        const previous = await runtimeQuery.previousSuccessful(deploymentId);

        if (!previous) {
            throw new Error("No previous successful deployment found.");
        }

        const runtimes = await runtimeQuery.previousRuntime(previous.id);

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

            const restored =
                await kubernetesDeployer.deploy({
                    deploymentId: buildPlan.deploymentId,
                    buildPlan,
                    rollback: true,
                });

          
            runtimeGroup.add(previous.id, restored);

            runtimeManager.register(restored.runtime);

            await runtimeRegistry.register(restored.runtime);
        }

        await statusService.update(
            deploymentId,
            "ROLLED_BACK"
        );

        await statusService.update(
            previous.id,
            "SUCCESS"
        );

        await db.query(
            `
      UPDATE projects
      SET
        current_deployment_id = $1,
        updated_at = NOW()
      WHERE id = $2
      `,
            [
                previous.id,
                previous.project_id,
            ]
        );

        await deploymentEvents.emit({
            deploymentId,
            event: "ROLLBACK_COMPLETED",
            message: `Recovered using deployment ${previous.id}`,
        });

        try {
            const { getIO } = require("../../config/socket");
            const io = getIO();

            io.to(deploymentId).emit(
                "rollback_completed",
                {
                    failedDeploymentId: deploymentId,
                    activeDeploymentId: previous.id,
                    status: "ROLLED_BACK",
                }
            );

            io.emit(
                "deployment_context_changed",
                {
                    failedDeploymentId: deploymentId,
                    activeDeploymentId: previous.id,
                    status: "ROLLED_BACK",
                }
            );
        } catch (err) {
            console.warn(
                "Rollback websocket notification failed:",
                err.message
            );
        }

        return previous.id;
    }
}

module.exports = new PlatformRollbackService();