class RuntimeGroupService {
  constructor() {
    this.groups = new Map();
  }

  add(deploymentId, runtime) {
    if (!this.groups.has(deploymentId)) {
      this.groups.set(deploymentId, []);
    }

    this.groups.get(deploymentId).push(runtime);
  }

  get(deploymentId) {
    return this.groups.get(deploymentId) || [];
  }

  remove(deploymentId) {
    this.groups.delete(deploymentId);
  }

  list() {
    return [...this.groups.values()].flat();
  }
  count(deploymentId) {
    return this.get(deploymentId).length;
  }
}

module.exports = new RuntimeGroupService();
