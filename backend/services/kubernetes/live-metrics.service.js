const metrics = require("./metrics.service");
const bus = require("../events/event-bus.service");
const events = require("../events/runtime-events");

class LiveMetrics {

    async publish(pod) {

        try {

            const data = await metrics.get(pod);

             bus.publish(
    events.POD_UPDATED,
    pod
);
            

        } catch {}

    }

}

module.exports = new LiveMetrics();