class DeploymentLockService {
  constructor() {
    this.projects = new Set();
  }

  acquire(projectId) {
    if (this.projects.has(projectId)) {
      return false;
    }

    this.projects.add(projectId);

    return true;
  }

  release(projectId) {
    this.projects.delete(projectId);
  }

  locked(projectId) {
    return this.projects.has(projectId);
  }
}

module.exports = new DeploymentLockService();