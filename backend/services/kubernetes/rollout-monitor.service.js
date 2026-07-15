const kubectl = require("./kubectl.service");

class RolloutMonitor {

  async wait(name, namespace = "default") {

    return kubectl.execute([
      "rollout",
      "status",
      `deployment/${name}`,
      "-n",
      namespace,
    ]);

  }

}

module.exports = new RolloutMonitor();