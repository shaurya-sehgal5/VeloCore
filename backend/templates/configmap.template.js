module.exports = ({
    name,
    namespace,
    data = {},
}) => ({
    apiVersion: "v1",

    kind: "ConfigMap",

   metadata: {
    name,
    namespace,
},

    data,
});