class KubernetesSocketService {
  constructor() {
    this.io = null;
  }

  initialize(io) {
    this.io = io;
  }

  emit(namespace, event, payload) {
    if (!this.io) return;

    this.io.to(namespace).emit(event, payload);
  }

  broadcast(event, payload) {
    if (!this.io) return;

    this.io.emit(event, payload);
  }
}

module.exports = new KubernetesSocketService();