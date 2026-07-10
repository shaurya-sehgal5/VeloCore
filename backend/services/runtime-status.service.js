class RuntimeStatusService {
  constructor() {
    this.clients = new Map();
  }

  register(deploymentId, res) {
    this.clients.set(deploymentId, res);
  }

  remove(deploymentId) {
    this.clients.delete(deploymentId);
  }

  publish(deploymentId, event) {
    const client = this.clients.get(deploymentId);

    if (!client) return;

    client.write(
      `data: ${JSON.stringify(event)}\n\n`
    );
  }
}

module.exports = new RuntimeStatusService();