const dockerEngine = require("./docker-engine.service");

class DeploymentEngine {
  async deploy(options) {
    switch (options.engine) {
      case "docker":
        options.engine ??= "docker";
        return dockerEngine.deploy(options);

      case "compose":
        throw new Error("Docker Compose engine not implemented.");

      case "kubernetes":
        throw new Error("Kubernetes engine not implemented.");

      default:
        throw new Error(`Unknown deployment engine: ${options.engine}`);
    }
  }
}

module.exports = new DeploymentEngine();
