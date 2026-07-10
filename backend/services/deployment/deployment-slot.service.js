class DeploymentSlotService {
  constructor() {
    this.activeSlots = new Map();
  }

  active(deploymentId) {
    return this.activeSlots.get(deploymentId) || "blue";
  }

  next(deploymentId) {
    return this.active(deploymentId) === "blue"
      ? "green"
      : "blue";
  }

  switch(deploymentId) {
    const slot = this.next(deploymentId);

    this.activeSlots.set(deploymentId, slot);

    return slot;
  }

  set(deploymentId, slot) {
    this.activeSlots.set(deploymentId, slot);
  }
}

module.exports = new DeploymentSlotService();