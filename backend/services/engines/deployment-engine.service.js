const runtimeProvider = require("../runtime/runtime-provider.service");
const runtimePipeline = require("../runtime/runtime-pipeline.service");

class DeploymentEngine {

    async deploy(options) {

        const runtime = await runtimeProvider.create(options);

        await runtimePipeline.start(runtime);

        return runtime;

    }

}

module.exports = new DeploymentEngine();