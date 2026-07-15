const resources = require("./resources.template");

module.exports = ({
  name,
  namespace,
  image,
  replicas = 1,
  containerPort,
  healthCheck,
  configMap,
  secret,
}) => ({
  apiVersion: "apps/v1",

  kind: "Deployment",

  metadata: {
    name,
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

            imagePullPolicy: "Always",

            ports: [
              {
                containerPort,
              },
            ],

            resources,

            readinessProbe: {
              httpGet: {
                path: healthCheck.path,
                port: containerPort,
              },
              initialDelaySeconds: 10,
              periodSeconds: 5,
            },

            livenessProbe: {
              httpGet: {
                path: healthCheck.path,
                port: containerPort,
              },
              initialDelaySeconds: 30,
              periodSeconds: 10,
            },

            securityContext: {
              allowPrivilegeEscalation: false,
              readOnlyRootFilesystem: false,
            },

            envFrom: [
              {
                configMapRef: {
                  name: configMap,
                },
              },
              {
                secretRef: {
                  name: secret,
                },
              },
            ],
          },
        ],
      },
    },
  },
});