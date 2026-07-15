module.exports = ({
    namespace,
}) => ({
    apiVersion: "v1",

    kind: "LimitRange",

    metadata: {
        name: "default-limits",

        namespace,
    },

    spec: {
        limits: [
            {
                type: "Container",

                default: {
                    cpu: "500m",

                    memory: "512Mi",
                },

                defaultRequest: {
                    cpu: "100m",

                    memory: "128Mi",
                },
            },
        ],
    },
});