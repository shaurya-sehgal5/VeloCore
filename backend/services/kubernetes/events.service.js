const kubectl = require("./kubectl.service");

class EventsService {
  async list(namespace = "default") {
    const output = await kubectl.execute([
      "get",
      "events",
      "-n",
      namespace,
      "--sort-by=.lastTimestamp",
      "-o",
      "json",
    ]);

    return JSON.parse(output);
  }
}

module.exports = new EventsService();