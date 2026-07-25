module.exports = ({
  name,
  namespace,
  host,
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
                  name,

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