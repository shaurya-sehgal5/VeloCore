const dockerService = require("./docker.service");
const runtimeResolver = require("./runtime-resolver.service");

class StatsService {
  async stats(deploymentId) {
    const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    const stats = await dockerService.execute(
      "docker",
      ["stats", "--no-stream", "--format", "{{json .}}", runtime.container_name],
      deploymentId,
    );

    return JSON.parse(stats.trim());
  }
}

module.exports = new StatsService();
