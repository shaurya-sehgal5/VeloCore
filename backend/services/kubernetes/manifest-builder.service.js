const deploymentTemplate = require("./deployment.template");
const serviceTemplate = require("./service.template");

class ManifestBuilder {
  build(buildPlan) {
    return {
      deployment: deploymentTemplate({
        name: buildPlan.projectName,

        image: buildPlan.imageName,

        containerPort: buildPlan.containerPort,
      }),

      service: serviceTemplate({
        name: buildPlan.projectName,

        port: buildPlan.containerPort,

        targetPort: buildPlan.containerPort,
      }),
    };
  }
}

module.exports = new ManifestBuilder();