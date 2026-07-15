module.exports = ({ name }) => ({
  apiVersion: "v1",

  kind: "ResourceQuota",

  metadata: {
    name: `${name}-quota`,
    namespace: name,
  },

  spec: {
    hard: {
      pods: "20",

      "requests.cpu": "4",

      "requests.memory": "8Gi",

      "limits.cpu": "8",

      "limits.memory": "16Gi",
    },
  },
});