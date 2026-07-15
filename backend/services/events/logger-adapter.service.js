const bus = require("./event-bus.service");
const logger = require("../monitoring/logger.service");

class LoggerAdapter {

    initialize() {

        bus.subscribeAny = undefined;

        const original = bus.emit.bind(bus);

        bus.emit = (event, payload) => {

            logger.info(
                `[${event}]`
            );

            return original(event, payload);

        };

    }

}

module.exports = new LoggerAdapter();