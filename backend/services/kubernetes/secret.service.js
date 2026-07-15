const kubectl = require("./kubectl.service");

class SecretService {
  async list(namespace = "default") {
    const output = await kubectl.execute([
      "get",
      "secrets",
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
      "secret",
      name,
      "-n",
      namespace,
    ]);
  }

  async delete(name, namespace = "default") {
    return kubectl.execute([
      "delete",
      "secret",
      name,
      "-n",
      namespace,
    ]);
  }
}

module.exports = new SecretService();