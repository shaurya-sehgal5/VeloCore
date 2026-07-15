module.exports = ({
  name,
  namespace,
  host,
  service,
  port,
}) => ({
  apiVersion: "networking.k8s.io/v1",

  kind: "Ingress",

  metadata: {
    name,
    namespace,

    annotations: {
      "nginx.ingress.kubernetes.io/rewrite-target": "/",
    },
  },

  spec: {
    ingressClassName: "nginx",

    tls: [
      {
        hosts: [
          host,
        ],

        secretName: `${name}-tls`,
      },
    ],

    rules: [
      {
        host,

        http: {
          paths: [
            {
              path: "/",

              pathType: "Prefix",

              backend: {
                service: {
                  name: service,

                  port: {
                    number: port,
                  },
                },
              },
            },
          ],
        },
      },
    ],
  },
});