module.exports = ({
  name,
  port,
  targetPort,
}) => ({
  apiVersion: "v1",

  kind: "Service",

  metadata: {
    name,
  },

  spec: {
    type: "NodePort",

    selector: {
      app: name,
    },

    ports: [
      {
        protocol: "TCP",

        port,

        targetPort,

        // Let Kubernetes choose the NodePort
      },
    ],
  },
});