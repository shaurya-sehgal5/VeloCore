module.exports = ({
  name,
  namespace,
  minReplicas = 1,
  maxReplicas = 5,
  cpu = 70,
}) => ({
  apiVersion: "autoscaling/v2",

  kind: "HorizontalPodAutoscaler",

  metadata: {
    name,
  },

  spec: {
    scaleTargetRef: {
      apiVersion: "apps/v1",
      kind: "Deployment",
      name,
    },

    minReplicas,

    maxReplicas,

    metrics: [
      {
        type: "Resource",

        resource: {
          name: "cpu",

          target: {
            type: "Utilization",

            averageUtilization: cpu,
          },
        },
      },
    ],
  },
});