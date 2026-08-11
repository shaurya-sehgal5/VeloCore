const buildPlanService = require("../docker/builder.service");

class BuilderService {
  createBuildPlan(node, deploymentId, slot) {
    const plan = buildPlanService.createBuildPlan(
      node,
      deploymentId,
      slot,
    );

    plan.scaling = null;

    plan.env = node.environment || node.env || {};

    plan.healthCheck = {
      path: node.type === "frontend"
        ? "/"
        : "/health",
    };

    return plan;
  }

  createRollbackPlan(runtime) {
    return {
      projectName: runtime.name,
      type: runtime.type,
      framework: runtime.framework,
      slot: runtime.slot || "green",
      deploymentId: runtime.deployment_id,
      imageName: runtime.image_name,
      namespace: runtime.namespace,
      deploymentName: runtime.deployment_name,
      serviceName: runtime.service_name,
      containerPort: runtime.container_port,
      port: runtime.container_port,
      replicas: runtime.replicas || 1,

      scaling: {
        min: 1,
        max: 5,
        cpu: 300,
      },

      healthCheck:
        runtime.type === "worker"
          ? null
          : {
            path:
              runtime.type === "frontend"
                ? "/"
                : "/health"
          },

      env: runtime.environment || {},
    };
  }
}

module.exports = new BuilderService();