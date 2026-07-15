module.exports = ({
    name,
    data = {},
}) => ({
    apiVersion: "v1",

    kind: "Secret",

    metadata: {
        name,
    },

    type: "Opaque",

    stringData: data,
});