const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");

const deploymentTemplate = require("./deployment.template");
const serviceTemplate = require("./service.template");

class KubernetesService {
  async generate(buildPlan) {
    const deployment = deploymentTemplate({
    name: buildPlan.projectName,

    image: buildPlan.imageName,

    containerPort: buildPlan.containerPort,

    env: [
        ["PORT", buildPlan.containerPort],
        ["NODE_ENV", "production"],
    ],
});

    const service = serviceTemplate({
  name: buildPlan.projectName,

  port: buildPlan.containerPort,

  targetPort: buildPlan.containerPort,
});

    const manifest = [deployment, service]
      .map((doc) => yaml.dump(doc))
      .join("---\n");

    const tempDir = path.join(__dirname, "../../temp");

    await fs.mkdir(tempDir, { recursive: true });

    const file = path.join(tempDir, `${buildPlan.projectName}.yaml`);

    await fs.writeFile(file, manifest);

    return file;
  }
}

module.exports = new KubernetesService();