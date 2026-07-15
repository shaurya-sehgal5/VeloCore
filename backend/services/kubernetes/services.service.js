const kubectl = require("./kubectl.service");

class ServicesService {
  async list(namespace = "default") {
    const output = await kubectl.execute([
      "get",
      "services",
      "-n",
      namespace,
      "-o",
      "json",
    ]);

    return JSON.parse(output);
  }
}

module.exports = new ServicesService();