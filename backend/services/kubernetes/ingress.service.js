const fs = require("fs/promises");
const os = require("os");
const pathModule = require("path");
const { randomUUID } = require("crypto");

class IngressService {

    async generate({
        deploymentId,
        buildPlan
    }) {

       const ingressPath = `/apps/${deploymentId}`;

        const yaml = `
apiVersion: networking.k8s.io/v1
kind: Ingress

metadata:
  name: ${buildPlan.projectName}-ingress
  namespace: ${buildPlan.namespace}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2

spec:
  ingressClassName: nginx

  rules:
    - http:
        paths:
          - path: ${ingressPath}(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: ${buildPlan.projectName}
                port:
                  number: ${buildPlan.containerPort}
`;

        const file = pathModule.join(
            os.tmpdir(),
            `${randomUUID()}.yaml`
        );

        await fs.writeFile(file, yaml);

        return {
            file,
            ingressPath,
        };

    }

}

module.exports =
    new IngressService();