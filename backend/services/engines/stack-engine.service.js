const builderService = require("../builder.service");
const deploymentEngine = require("./deployment-engine.service");
const deploymentSlot = require("../deployment-slot.service");
const runtimeGroup = require("../runtime-group.service");

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
          runtimeGroup.add(deploymentId, runtime.runtime);
        }
      }
    }
    deployments.sort((a, b) => {
      const order = {
        backend: 1,
        worker: 2,
        frontend: 3,
      };

      return (order[a.runtime.type] || 99) - (order[b.runtime.type] || 99);
    });
    return deployments;
  }

  async deployNode({ node, deploymentId, workspace, repository, env, graph }) {
    const slot = deploymentSlot.next(deploymentId);

    const buildPlan = builderService.createBuildPlan(node, deploymentId, slot);

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
