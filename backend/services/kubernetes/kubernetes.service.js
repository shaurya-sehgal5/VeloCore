const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const hpaTemplate = require("../../templates/hpa.template");
const deploymentTemplate = require("../../templates/deployment.template");
const serviceTemplate = require("../../templates/service.template");
const ingressTemplate = require("../../templates/ingress.template");
const configMapTemplate = require("../../templates/configmap.template");
const secretTemplate = require("../../templates/secret.template");
const namespaceTemplate = require("../../templates/namespace.template");

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
    const ingress = ingressTemplate({
      name: buildPlan.projectName,
      namespace: buildPlan.namespace,
      host: `${buildPlan.projectName}.velocore.local`,

      service: buildPlan.projectName,

      port: buildPlan.containerPort,
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

    const hpa = hpaTemplate({
      name: buildPlan.projectName,
      namespace: buildPlan.namespace,
      minReplicas: buildPlan.scaling.min,

      maxReplicas: buildPlan.scaling.max,

      cpu: buildPlan.scaling.cpu,
    });

    const manifest = [
      configMap,
      secret,
      deployment,
      service,
      ingress,
      hpa,
      // ...(buildPlan.persistentVolume ? [pvc] : []),
    ]
      .map((doc) => yaml.dump(doc))
      .join("---\n");

    const tempDir = path.join(__dirname, "../../temp");

    await fs.mkdir(tempDir, {
      recursive: true,
    });

    const file = path.join(tempDir, `${buildPlan.projectName}.yaml`);

    await fs.writeFile(file, manifest);

    return file;
  }
}

module.exports = new KubernetesService();
