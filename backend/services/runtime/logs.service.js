const dockerService = require("../docker/docker.service");
const runtimeResolver = require("./runtime-resolver.service");

class LogsService {
  async logs(deploymentId, lines = 200) {
  const runtime = await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    return dockerService.execute(
      "docker",
      [
        "logs",
        "--tail",
        String(lines),
        runtime.container_name,
      ],
      deploymentId
    );
  }
}

module.exports = new LogsService();