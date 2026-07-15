const buildPlanService = require("../docker/builder.service");

class BuilderService {
  createBuildPlan(node, deploymentId, slot) {
    const plan = buildPlanService.createBuildPlan(
      node,
      deploymentId,
      slot,
    );

    plan.scaling = {
      min: 1,
      max: 5,
      cpu: 70,
    };

    plan.healthCheck = {
      path: node.type === "frontend" ? "/" : "/health",
    };

    return plan;
  }
}

module.exports = new BuilderService();