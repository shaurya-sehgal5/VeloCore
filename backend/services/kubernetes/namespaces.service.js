const kubectl = require("./kubectl.service");

class NamespaceService {
  async exists(name) {
    try {
      await kubectl.execute(["get", "namespace", name]);

      return true;
    } catch {
      return false;
    }
  }

  async create(name) {
    try {
      await kubectl.execute(["create", "namespace", name]);
    } catch (err) {
      if (!err.message.includes("AlreadyExists")) {
        throw err;
      }
    }
  }

 async ensure(name) {
  await this.create(name);
}
}

module.exports = new NamespaceService();
