module.exports = ({ name }) => ({
  apiVersion: "v1",

  kind: "Namespace",

  metadata: {
    name,
  },
});