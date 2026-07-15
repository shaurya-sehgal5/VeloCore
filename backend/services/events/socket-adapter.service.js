const bus = require("./event-bus.service");
const socket = require("../kubernetes/kubernetes-socket.service");
const events = require("./runtime-events");

class SocketAdapter {

    initialize() {

        Object.values(events).forEach(event => {

            bus.subscribe(event, payload => {

                socket.broadcast(event, payload);

            });

        });

    }

}

module.exports = new SocketAdapter();