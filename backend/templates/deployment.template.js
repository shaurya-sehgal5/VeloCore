const resources = require("./resources.template");

module.exports = ({
  name,
  namespace,
  image,
  replicas = 1,
  containerPort,
  healthCheck = { path: "/" },
  configMap,
  secret,
}) => ({
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name,
    namespace,
  },
  spec: {
    replicas,
    revisionHistoryLimit: 2,
    strategy: {
      type: "RollingUpdate",
      rollingUpdate: {
        maxUnavailable: 1,
        maxSurge: 1,
      },
    },
    selector: {
      matchLabels: {
        app: name,
      },
    },
    template: {
      metadata: {
        labels: {
          app: name,
        },
      },
      spec: {
        terminationGracePeriodSeconds: 5,
        containers: [
          {
            name,
            image,
            imagePullPolicy: "IfNotPresent",
            ports: [
              {
                containerPort,
              },
            ],
            resources,
            readinessProbe: {
              httpGet: {
                path: healthCheck.path || "/",
                port: containerPort,
              },
              initialDelaySeconds: 3,
              periodSeconds: 2,
              timeoutSeconds: 2,
              failureThreshold: 3,
              successThreshold: 1,
            },
            livenessProbe: {
              httpGet: {
                path: healthCheck.path || "/",
                port: containerPort,
              },
              initialDelaySeconds: 10,
              periodSeconds: 5,
              timeoutSeconds: 2,
            },
            securityContext: {
              allowPrivilegeEscalation: false,
              readOnlyRootFilesystem: false,
            },

            envFrom: [
              ...(configMap ? [{ configMapRef: { name: configMap } }] : []),
              ...(secret ? [{ secretRef: { name: secret } }] : [])
            ].filter(Boolean),
          },
        ],
      },
    },
  },
});