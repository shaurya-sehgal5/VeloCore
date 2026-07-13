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
    selector: {
      app: name,
    },

    ports: [
      {
        protocol: "TCP",

        port,

        targetPort,
      },
    ],

    type: "NodePort",
  },
});