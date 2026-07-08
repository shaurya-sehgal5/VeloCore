const builderService = require("../builder.service");
const deploymentEngine = require("./deployment-engine.service");

class StackEngine {
  async deploy({ graph, deploymentId, workspace, repository, env }) {
    const deployments = [];

    for (const stage of graph.deploymentPlan) {
      if (stage.parallel) {
        const results = await Promise.all(
          stage.nodes.map((node) =>
            this.deployNode({
              graph,
              node,
              deploymentId,
              workspace,
              repository,
              env,
            }),
          ),
        );

        deployments.push(...results);
      } else {
        for (const node of stage.nodes) {
          const runtime = await this.deployNode({
            graph,
            node,
            deploymentId,
            workspace,
            repository,
            env,
          });

          deployments.push(runtime);
        }
      }
    }

    return deployments;
  }

  async deployNode({ node, deploymentId, workspace, repository, env , graph }) {
    const buildPlan = builderService.createBuildPlan(
      node,

      deploymentId,
    );

    const runtime = await deploymentEngine.deploy({
      engine: "docker",

      graph,

      deploymentId,

      workspace,

      repository,

      buildPlan,

      env,
    });

    return {
      node,

      runtime,
    };
  }
}

module.exports = new StackEngine();
