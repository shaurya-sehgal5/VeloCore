const socketAdapter = require("./socket-adapter.service");
const loggerAdapter = require("./logger-adapter.service");
const runtimeAdapter = require("./runtime-adapter.service");

class Bootstrap {

    start() {

        socketAdapter.initialize();

        loggerAdapter.initialize();

        runtimeAdapter.initialize();

        console.log(
            "⚡ Event Bus Ready"
        );

    }

}

module.exports = new Bootstrap();