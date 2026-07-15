const podMonitor = require("./pod-monitor.service");
const deploymentMonitor = require("./deployment-monitor.service");
const eventMonitor = require("./event-monitor.service");

class KubernetesMonitorService {
  constructor() {
    this.running = false;

    this.monitors = [];
  }

  start(namespace = "default") {
    if (this.running) {
      return;
    }

    this.running = true;

    this.monitors.push(
      podMonitor.start(namespace)
    );

    this.monitors.push(
      deploymentMonitor.start(namespace)
    );

    this.monitors.push(
      eventMonitor.start(namespace)
    );

    console.log("☸ Kubernetes Monitor Started");
  }

  stop() {
    for (const monitor of this.monitors) {
      monitor.kill();
    }

    this.monitors = [];

    this.running = false;

    console.log("☸ Kubernetes Monitor Stopped");
  }
}

module.exports = new KubernetesMonitorService();