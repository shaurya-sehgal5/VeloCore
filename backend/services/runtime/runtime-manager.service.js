const metrics = require("../monitoring/metrics.service");

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
    const key = `${runtime.deploymentId}:${runtime.project}:${runtime.slot}`;

    this.runtimes.set(key, {
      ...runtime,
      engine: runtime.engine || "docker",
      deployment: runtime.deployment,
      service: runtime.service,
      pod: runtime.pod,
      namespace: runtime.namespace || "default",
      status: "RUNNING",
      health: "UNKNOWN",

      host: runtime.host,
      namespace: runtime.namespace || "default",

      startedAt: Date.now(),
      metrics: {
        cpu: "0%",
        memory: "0 MB",
        network: "0 B",
        uptime: 0,
      },
    });

    metrics.runtimeCount.set(this.runtimes.size);
  }

  /*
  ------------------------------------
  Get Runtime
  ------------------------------------
  */

  get(deploymentId, project, slot) {
    return this.runtimes.get(`${deploymentId}:${project}:${slot}`);
  }

  /*
  ------------------------------------
  Update Runtime
  ------------------------------------
  */

  update(deploymentId, project, slot, values) {
    const runtime = this.get(deploymentId, project, slot);

    if (!runtime) return;

    Object.assign(runtime, values);
  }

  /*
  ------------------------------------
  Remove Runtime
  ------------------------------------
  */

  remove(deploymentId, project, slot) {
    this.runtimes.delete(`${deploymentId}:${project}:${slot}`);

    metrics.runtimeCount.set(this.runtimes.size);
  }

  /*
  ------------------------------------
  List
  ------------------------------------
  */

  list() {
    return [...this.runtimes.values()];
  }
  clearDeployment(deploymentId) {
    for (const [key, runtime] of this.runtimes.entries()) {
      if (runtime.deploymentId === deploymentId) {
        this.runtimes.delete(key);
      }
    }
    metrics.runtimeCount.set(this.runtimes.size);
  }
}

module.exports = new RuntimeManager();
