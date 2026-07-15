const kubectl = require("./kubectl.service");
const bus = require("../events/event-bus.service");
const events = require("../events/runtime-events");

class HealthMonitor {

  async check(name, namespace = "default") {

    const output = await kubectl.execute([
      "get",
      "pod",
      name,
      "-n",
      namespace,
      "-o",
      "json",
    ]);

    const pod = JSON.parse(output);

    return {
      phase: pod.status.phase,
      ready:
        pod.status.conditions?.find(
          c => c.type === "Ready"
        )?.status === "True",
    };
bus.publish(
    events.POD_UPDATED,
    pod
);
  }

}

module.exports = new HealthMonitor();