const kubectl = require("./kubectl.service");

class PVCService {
  async list(namespace = "default") {
    const output = await kubectl.execute([
      "get",
      "pvc",
      "-n",
      namespace,
      "-o",
      "json",
    ]);

    return JSON.parse(output);
  }
}

module.exports = new PVCService();