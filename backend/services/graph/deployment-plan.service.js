class DeploymentPlanService {
  create(graph) {
    const plan = [];

    const parallelNodes = [];

    if (graph.backend) {
      parallelNodes.push(graph.backend);
    }

    if (graph.frontend) {
      parallelNodes.push(graph.frontend);
    }

    if (parallelNodes.length) {
      plan.push({
        stage: "applications",
        parallel: true,
        nodes: parallelNodes,
      });
    }

    if (graph.workers.length) {
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