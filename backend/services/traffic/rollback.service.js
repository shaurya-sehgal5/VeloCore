
class RollbackService {
  constructor() {
    this.history = new Map();
  }

  /*
  ------------------------------------
  Save Deployment
  ------------------------------------
  */

  save(runtime) {
    const previous = this.history.get(runtime.deploymentId);

    if (previous?.slot === runtime.slot) {
      return;
    }

    this.history.set(runtime.deploymentId, runtime);
  }

  /*
  ------------------------------------
  Previous Runtime
  ------------------------------------
  */

  get(deploymentId) {
    return this.history.get(deploymentId);
  }

  /*
  ------------------------------------
  Remove
  ------------------------------------
  */

  remove(deploymentId) {
    this.history.delete(deploymentId);
  }
}

module.exports = new RollbackService();
