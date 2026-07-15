const kubectl = require("./kubectl.service");

class ReplicaSetsService {
  async list(namespace = "default") {
    const output = await kubectl.execute([
      "get",
      "replicasets",
      "-n",
      namespace,
      "-o",
      "json",
    ]);

    return JSON.parse(output);
  }
}

module.exports = new ReplicaSetsService();