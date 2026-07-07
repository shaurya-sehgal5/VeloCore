const logger = require("./logger.service");
const gitService = require("./git.service");
const workspaceService = require("./workspace.service");
const cleanupService = require("./cleanup.service");
const statusService = require("./status.service");

const { scanRepository } = require("./scanner.service");

const repositoryGraph = require("./graph/repository-graph.service");
const stackEngine = require("./engines/stack-engine.service");

class DeploymentOrchestrator {
  async deploy({ repoUrl, githubToken, deploymentId, env = {} }) {
    let workspace = null;

    try {
      logger.deployment(deploymentId, "🚀 Starting deployment...");

      /*
            ----------------------------------
            Create Workspace
            ----------------------------------
            */

      workspace = await workspaceService.create();

      logger.deployment(deploymentId, `📁 Workspace Created : ${workspace.id}`);

      /*
            ----------------------------------
            Clone Repository
            ----------------------------------
            */

      await statusService.update(deploymentId, "CLONING");

      const repositoryPath = await gitService.clone(
        repoUrl,
        githubToken,
        workspace.path,
      );

      /*
            ----------------------------------
            Scan Repository
            ----------------------------------
            */

     await statusService.update(deploymentId, "SCANNING");

const repository = scanRepository(repositoryPath);

logger.deployment(
    deploymentId,
    `🔍 ${repository.projects.length} deployable project(s) detected`
);

const graph = repositoryGraph.build(repository);

logger.deployment(
    deploymentId,
    "📊 Deployment Graph Created"
);

logger.deployment(
    deploymentId,
    `Frontend : ${graph.frontend?.name || "None"}`
);

logger.deployment(
    deploymentId,
    `Backend : ${graph.backend?.name || "None"}`
);

logger.deployment(
    deploymentId,
    `Workers : ${graph.workers.length}`
);

      /*
            ----------------------------------
            Deploy Entire Stack
            ----------------------------------
            */

      await stackEngine.deploy({
        graph,

        deploymentId,

        workspace,

        repository,

        env,
      });

      /*
            ----------------------------------
            Cleanup Workspace
            ----------------------------------
            */

      await cleanupService.success(workspace);

      logger.deployment(deploymentId, "🎉 Deployment Finished Successfully.");

      return {
        success: true,

        deploymentId,

        graph,

        url: `http://localhost:8000/visit/${deploymentId}`,
      };
    } catch (error) {
      logger.error(error.message);

      await statusService.update(deploymentId, "FAILED");

      if (workspace) {
        await cleanupService.failed({
          workspace,

          deploymentId,
        });
      }

      throw error;
    }
  }
}

module.exports = new DeploymentOrchestrator();
