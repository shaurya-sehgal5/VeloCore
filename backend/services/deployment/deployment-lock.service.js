class DeploymentLockService {
  constructor() {
    this.deployments = new Set();
  }

  acquire(deploymentId) {
    if (this.deployments.has(deploymentId)) {
      return false;
    }

    this.deployments.add(deploymentId);
    return true;
  }

  release(deploymentId) {
    this.deployments.delete(deploymentId);
  }

  locked(deploymentId) {
    return this.deployments.has(deploymentId);
  }
}

module.exports = new DeploymentLockService();