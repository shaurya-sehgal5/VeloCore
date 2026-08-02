const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const deploymentTemplate = require("../../templates/deployment.template");
const serviceTemplate = require("../../templates/service.template");
const configMapTemplate = require("../../templates/configmap.template");
const secretTemplate = require("../../templates/secret.template");
const namespaceTemplate = require("../../templates/namespace.template");
const ingressTemplate = require("../../templates/ingress.template");

class KubernetesService {
  async generate(buildPlan) {
    const deployment = deploymentTemplate({
      name: buildPlan.projectName,
      namespace: buildPlan.namespace,
      image: buildPlan.imageName,

      containerPort: buildPlan.containerPort,

      healthCheck: buildPlan.healthCheck,

      configMap: `${buildPlan.projectName}-config`,

      secret: `${buildPlan.projectName}-secret`,
    });

    const service = serviceTemplate({
      name: buildPlan.projectName,
      namespace: buildPlan.namespace,
      port: buildPlan.containerPort,

      targetPort: buildPlan.containerPort,
    });
    const configMap = configMapTemplate({
      name: `${buildPlan.projectName}-config`,
      namespace: buildPlan.namespace,
      data: {
        PORT: String(buildPlan.containerPort),
        NODE_ENV: "production",
      },
    });
    const secret = secretTemplate({
      name: `${buildPlan.projectName}-secret`,
      namespace: buildPlan.namespace,
      data: buildPlan.secrets || {},
    });

   
    const ingress = ingressTemplate({
      name: buildPlan.projectName,
      namespace: buildPlan.namespace,

      host:
        buildPlan.customDomain ||
        `${buildPlan.projectName}.velocore.local`,

      port: buildPlan.containerPort,
    });
    const documents = [
      configMap,
      secret,
      deployment,
      service,
    ];

    if (buildPlan.useIngress) {
      documents.push(ingress);
    }

    // documents.push(hpa);

    const manifest = documents
      .map((doc) => yaml.dump(doc).trim())
      .join("\n---\n");

    const tempDir = path.join(__dirname, "../../temp");

    await fs.mkdir(tempDir, {
      recursive: true,
    });

    const file = path.join(
      tempDir,
      `${buildPlan.projectName}-${buildPlan.slot}.yaml`,
    );
    await fs.writeFile(file, manifest, {
      flag: "w",
    });

    return file;
  }
}

module.exports = new KubernetesService();
