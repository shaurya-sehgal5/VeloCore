class DeploymentPlanService {
  create(graph) {
    const plan = [];


    const applications = [];

    if (graph.backend) {
      applications.push(graph.backend);
    }

    if (graph.frontend) {
      applications.push(graph.frontend);
    }

    if (applications.length) {
      plan.push({
        stage: "applications",
        parallel: true,
        nodes: applications,
      });
    }

    if (graph.workers?.length) {
      plan.push({
        stage: "workers",
        parallel: true,
        nodes: graph.workers,
      });
    }

    return plan;
  }
}

module.exports = new DeploymentPlanService();