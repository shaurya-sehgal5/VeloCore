const dockerEngine = require("./docker-engine.service");

class DockerfileEngine {

    async deploy(options) {

        return dockerEngine.deploy({

            ...options,

            buildPlan: {

                ...options.buildPlan,

                dockerfile: options.dockerfile

            }

        });

    }

}

module.exports = new DockerfileEngine();