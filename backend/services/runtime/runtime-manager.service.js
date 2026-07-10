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
}

  /*
  ------------------------------------
  Get Runtime
  ------------------------------------
  */

 get(deploymentId, project, slot) {
  return this.runtimes.get(
    `${deploymentId}:${project}:${slot}`
  );
}

  /*
  ------------------------------------
  Update Runtime
  ------------------------------------
  */
update(deploymentId, project, slot, values) {
  const runtime = this.get(
    deploymentId,
    project,
    slot
  );

  if (!runtime) return;

  Object.assign(runtime, values);
}
  /*
  ------------------------------------
  Remove Runtime
  ------------------------------------
  */

remove(deploymentId, project, slot) {
  this.runtimes.delete(
    `${deploymentId}:${project}:${slot}`
  );
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
