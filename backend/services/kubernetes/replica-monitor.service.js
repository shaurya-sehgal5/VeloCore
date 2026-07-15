const bus = require("../events/event-bus.service");
const events = require("../events/runtime-events");
const kubectl = require("./kubectl.service");

class ReplicaMonitor {

    async publish(name) {

        const deployment = JSON.parse(
            await kubectl.execute([
                "get",
                "deployment",
                name,
                "-o",
                "json",
            ])
        );

       bus.publish(
    events.POD_UPDATED,
    pod
);

    }

}

module.exports = new ReplicaMonitor();