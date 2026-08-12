const dockerEngine = require("./docker-engine.service");

class DockerfileEngine {
    async deploy(options) {
        options.buildPlan = {
            ...options.buildPlan,
            dockerfile:
                options.dockerfile ||
                options.buildPlan.dockerfile,
            buildContext:
                options.buildContext ||
                options.buildPlan.buildContext ||
                ".",
        };

        return dockerEngine.deploy(options);
    }
}

module.exports = new DockerfileEngine();