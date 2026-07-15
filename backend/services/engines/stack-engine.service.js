const builderService = require("../builder/builder.service");
const buildEngine = require("../builder/build-engine.service");
const deploymentEngine = require("./deployment-engine.service");
const deploymentSlot = require("../deployment/deployment-slot.service");
const runtimeGroup = require("../runtime/runtime-group.service");
const trivyService = require("../security/trivy.service");
const logger = require("../monitoring/logger.service");

class StackEngine {
  async deploy({ graph, deploymentId, workspace, repository, env }) {
    const jobs = [];

    /*
    ------------------------------------
    Create Build Plans
    ------------------------------------
    */

    for (const stage of graph.deploymentPlan) {
      for (const node of stage.nodes) {
        const slot = deploymentSlot.next(deploymentId);

        jobs.push({
          node,
          buildPlan: builderService.createBuildPlan(
            node,
            deploymentId,
            slot,
          ),
        });
      }
    }

    /*
    ------------------------------------
    Phase 1 - Build Images
    ------------------------------------
    */

    await Promise.all(
      jobs.map((job) =>
        buildEngine.build({
          deploymentId,
          repository,
          buildPlan: job.buildPlan,
        }),
      ),
    );

 
  /*
------------------------------------
Phase 2 - Security Scan
------------------------------------
*/

for (const job of jobs) {
  logger.deployment(
    deploymentId,
    `🔍 Scanning ${job.buildPlan.projectName}...`,
  );

  await trivyService.scan(job.buildPlan.imageName);

  logger.deployment(
    deploymentId,
    `🔒 ${job.buildPlan.projectName} scan completed`,
  );
}
    /*
    ------------------------------------
    Phase 3 - Deploy
    ------------------------------------
    */

    const deployments = await Promise.all(
      jobs.map(async (job) => {
        const runtime = await deploymentEngine.deploy({
          engine: process.env.RUNTIME_ENGINE || "docker",
          graph,
          deploymentId,
          workspace,
          repository,
          buildPlan: job.buildPlan,
          env,
        });

        runtimeGroup.add(deploymentId, runtime);

        return {
          node: job.node,
          runtime,
        };
      }),
    );

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
}

module.exports = new StackEngine();