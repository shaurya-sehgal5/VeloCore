const kubectl = require("./kubectl.service");

class ConfigMapService {
  async list(namespace = "default") {
    const output = await kubectl.execute([
      "get",
      "configmaps",
      "-n",
      namespace,
      "-o",
      "json",
    ]);

    return JSON.parse(output);
  }

  async update(file) {
    return kubectl.apply(file);
  }

  async describe(name, namespace = "default") {
    return kubectl.execute([
      "describe",
      "configmap",
      name,
      "-n",
      namespace,
    ]);
  }

  async delete(name, namespace = "default") {
    return kubectl.execute([
      "delete",
      "configmap",
      name,
      "-n",
      namespace,
    ]);
  }
}

module.exports = new ConfigMapService();