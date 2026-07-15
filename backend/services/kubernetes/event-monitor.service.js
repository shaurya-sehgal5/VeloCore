const watch = require("./watch.service");
const logger = require("../monitoring/logger.service");
const bus = require("../events/event-bus.service");
const events = require("../events/runtime-events");

class EventMonitor {
  start(namespace = "default") {
    const stream = watch.watch("events", namespace);

    stream.stdout.on("data", (data) => {
      const json = JSON.parse(data);

     bus.publish(
    events.POD_UPDATED,
    pod
);
    });

    stream.stderr.on("data", (err) => {
      logger.error(err.toString());
    });

    return stream;
  }
}

module.exports = new EventMonitor();
