const dockerEngine = require("./docker-engine.service");

class DockerfileEngine {

    async deploy(options) {

        options.buildPlan = {

            ...options.buildPlan,

            dockerfile: options.dockerfile,

            buildContext: "."

        };

        return dockerEngine.deploy(options);

    }

}

module.exports = new DockerfileEngine();