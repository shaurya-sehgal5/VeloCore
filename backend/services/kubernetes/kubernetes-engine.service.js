
const platformRollback = require("../deployment/platform-rollback.service");
const kubernetesDeployer = require("./kubernetes-deployer.service");
const logger = require("../monitoring/logger.service")
class KubernetesEngine {
  async deploy(buildPlan, deploymentId, env = {}) {
    await logger.info(
      deploymentId,
      "KUBERNETES",
      "Generating Kubernetes manifest..."
    );

    try {
      return await kubernetesDeployer.deploy({
        deploymentId,
        buildPlan,
        env,
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
