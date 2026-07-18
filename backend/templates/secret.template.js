module.exports = ({
    name,
    namespace,
    data = {},
}) => ({
    apiVersion: "v1",

    kind: "Secret",

   metadata: {
    name,
    namespace,
},

    type: "Opaque",

    stringData: data,
});