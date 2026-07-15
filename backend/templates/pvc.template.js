module.exports = ({
  name,
  size = "1Gi",
  storageClassName = "hostpath",
}) => ({
  apiVersion: "v1",

  kind: "PersistentVolumeClaim",

  metadata: {
    name,
  },

  spec: {
    accessModes: ["ReadWriteOnce"],

    storageClassName,

    resources: {
      requests: {
        storage: size,
      },
    },
  },
});