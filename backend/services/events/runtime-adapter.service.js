const bus = require("./event-bus.service");
const runtimeStatus = require("../runtime/runtime-status.service");
const events = require("./runtime-events");

class RuntimeAdapter {

    initialize() {

        bus.subscribe(
            events.RUNTIME_UPDATED,
            payload => {

                runtimeStatus.publish(
                    payload.deploymentId,
                    payload
                );

            }
        );

    }

}

module.exports = new RuntimeAdapter();