const kubernetesService = require("./kubernetes.service");
const platformRollback = require("../deployment/platform-rollback.service");
const kubernetesDeployer = require("./kubernetes-deployer.service");
const logger = require("../monitoring/logger.service")
class KubernetesEngine {
  async deploy(buildPlan, deploymentId) {
    await logger.info(
      deploymentId,
      "KUBERNETES",
      "Generating Kubernetes manifest..."
    );

    const manifest =
      await kubernetesService.generate(buildPlan);

    try {
      return await kubernetesDeployer.deploy({
        deploymentId,
        buildPlan,
        manifest,
      });
    } catch (err) {
      await logger.error(
        deploymentId,
        "KUBERNETES",
        `Rollout failed: ${err.message}`
      );

      await platformRollback.rollback(deploymentId);

      throw new Error(
        "Deployment failed. Previous deployment restored."
      );
    }
  }
}

module.exports = new KubernetesEngine();
