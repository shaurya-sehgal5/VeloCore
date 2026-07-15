const { spawn } = require("child_process");

class WatchService {

  watch(resource, namespace = "default") {

    return spawn(
      "kubectl",
      [
        "get",
        resource,
        "-n",
        namespace,
        "--watch",
        "-o",
        "json",
      ]
    );

  }

}

module.exports = new WatchService();