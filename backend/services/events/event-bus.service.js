const EventEmitter = require("events");

class EventBus extends EventEmitter {

  publish(event, payload) {

    this.emit(event, payload);

  }

  subscribe(event, handler) {

    this.on(event, handler);

  }

}

module.exports = new EventBus();