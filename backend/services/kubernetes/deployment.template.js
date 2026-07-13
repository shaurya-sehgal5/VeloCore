module.exports = ({
  name,
  image,
  replicas = 1,
  containerPort,
  env = [],
}) => ({
  apiVersion: "apps/v1",

  kind: "Deployment",

  metadata: {
    name,
  },

  spec: {
    replicas,

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

            env: env.map(([key, value]) => ({
              name: key,
              value: String(value),
            })),
          },
        ],
      },
    },
  },
});