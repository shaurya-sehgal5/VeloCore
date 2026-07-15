module.exports = ({
  name,
  namespace,
}) => ({
  apiVersion: "networking.k8s.io/v1",

  kind: "NetworkPolicy",

  metadata: {
    name: `${name}-network`,
    namespace,
  },

  spec: {
    podSelector: {
      matchLabels: {
        app: name,
      },
    },

    policyTypes: [
      "Ingress",
      "Egress",
    ],

    ingress: [
      {
        from: [
          {},
        ],
      },
    ],

    egress: [
      {
        to: [
          {},
        ],
      },
    ],
  },
});