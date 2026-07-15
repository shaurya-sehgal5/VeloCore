const watch = require("./watch.service");
const logger = require("../monitoring/logger.service");
const bus = require("../events/event-bus.service");
const events = require("../events/runtime-events");

class PodMonitor {
  start(namespace = "default") {
    const stream = watch.watch("pods", namespace);

    stream.stdout.on("data", (data) => {
      const json = JSON.parse(data);

      bus.publish(events.POD_UPDATED, pod);

      logger.info(`☸ Pod ${json.object?.metadata?.name}`);
    });

    stream.stderr.on("data", (err) => {
      logger.error(err.toString());
    });

    return stream;
  }
}

module.exports = new PodMonitor();
