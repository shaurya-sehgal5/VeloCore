const dockerEngine = require("../engines/docker-engine.service");
const dockerfileEngine = require("../engines/dockerfile-engine.service");
const composeEngine = require("../engines/compose-engine.service");

class RuntimeProvider {

    async create(options) {

        if (options.graph?.hasCompose) {

            return composeEngine.deploy({

                ...options,

                composeFile: options.graph.composeFile

            });

        }

        if (options.graph?.hasDockerfile) {

            return dockerfileEngine.deploy({

                ...options,

                dockerfile: options.graph.customDockerfile

            });

        }

        return dockerEngine.deploy(options);

    }

}

module.exports = new RuntimeProvider();