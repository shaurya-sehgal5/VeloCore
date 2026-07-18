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
    revisionHistoryLimit: 5,
    strategy: {
      type: "RollingUpdate",
      rollingUpdate: {
        maxUnavailable: 0,
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
        terminationGracePeriodSeconds: 30,
        containers: [
          {
            name,
            image,
            // FIX: Allows Kind to pick up images loaded directly onto nodes locally
            imagePullPolicy: process.env.NODE_ENV === "production" ? "Always" : "IfNotPresent",
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
              initialDelaySeconds: 15, // Raised slightly to allow slow i3 warm-ups
              periodSeconds: 5,
            },
            livenessProbe: {
              httpGet: {
                path: healthCheck.path || "/",
                port: containerPort,
              },
              initialDelaySeconds: 30,
              periodSeconds: 10,
            },
            securityContext: {
              allowPrivilegeEscalation: false,
              readOnlyRootFilesystem: false,
            },
            // Safely inject configurations only if they are provided
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