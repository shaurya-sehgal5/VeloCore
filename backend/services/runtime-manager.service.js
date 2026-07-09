class RuntimeManager {
  constructor() {
    this.runtimes = new Map();
  }

  /*
  ------------------------------------
  Register Runtime
  ------------------------------------
  */

  register(runtime) {
    console.log("REGISTERING:", runtime.deploymentId);

    this.runtimes.set(runtime.deploymentId, {
      ...runtime,
      status: "RUNNING",
      health: "UNKNOWN",
      startedAt: Date.now(),
      metrics: {
        cpu: "0%",
        memory: "0 MB",
        network: "0 B",
        uptime: 0,
      },
    });

    console.log("MAP SIZE:", this.runtimes.size);
  }

  /*
  ------------------------------------
  Get Runtime
  ------------------------------------
  */

  get(deploymentId) {
    return this.runtimes.get(deploymentId);
  }

  /*
  ------------------------------------
  Update Runtime
  ------------------------------------
  */

  update(deploymentId, values) {
    const runtime = this.get(deploymentId);

    if (!runtime) return;

    Object.assign(runtime, values);
  }

  /*
  ------------------------------------
  Remove Runtime
  ------------------------------------
  */

  remove(deploymentId) {
    this.runtimes.delete(deploymentId);
  }

  /*
  ------------------------------------
  List
  ------------------------------------
  */

  list() {
    return [...this.runtimes.values()];
  }
}

module.exports = new RuntimeManager();
