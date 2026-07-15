const kubectl = require("./kubectl.service");

class PodsService {
  async list(namespace = "default") {
    const output = await kubectl.execute([
      "get",
      "pods",
      "-n",
      namespace,
      "-o",
      "json",
    ]);

    return JSON.parse(output);
  }
}

module.exports = new PodsService();