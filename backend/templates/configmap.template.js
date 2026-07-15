module.exports = ({
    name,
    data = {},
}) => ({
    apiVersion: "v1",

    kind: "ConfigMap",

    metadata: {
        name,
    },

    data,
});