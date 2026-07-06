const logger = require("./logger.service");
const gitService = require("./git.service");
const builderService = require("./builder.service");
const workspaceService = require("./workspace.service");
const { scanRepository } = require("./scanner.service");
const dockerService = require("./docker.service");
const registryService = require("./registry.service");
const statusService = require("./status.service");


class DeploymentOrchestrator {
  async deploy({ repoUrl, githubToken, deploymentId, io, env = {} }) {
    let workspace = null;

    try {
      logger.deployment(io, deploymentId, "🚀 Starting deployment...");

      /*
            ===================================
            STEP 1
            Create Workspace
            ===================================
            */

      workspace = await workspaceService.create();

      logger.deployment(
        io,
        deploymentId,
        `📁 Workspace Created : ${workspace.id}`,
      );

      /*
            ===================================
            STEP 2
            Clone Repository
            ===================================
            */
await statusService.update(
    deploymentId,
    "CLONING"
);
      const repositoryPath = await gitService.clone(
        repoUrl,
        githubToken,
        workspace.path,
      );

      /*
            ===================================
            STEP 3
            Scan Repository
            ===================================
            */
await statusService.update(
    deploymentId,
    "SCANNING"
);
      const repository = scanRepository(repositoryPath);

      logger.deployment(
        io,
        deploymentId,
        `🔍 ${repository.projects.length} deployable project(s) found`,
      );

      if (repository.projects.length === 0) {
        throw new Error("No deployable project found.");
      }

      /*
            ===================================
            STEP 4
            Build Projects
            ===================================
            */
await statusService.update(
    deploymentId,
    "BUILDING"
);
      for (const project of repository.projects) {
        logger.deployment(io, deploymentId, `⚙ Building ${project.name}`);

        const buildPlan = builderService.createBuildPlan(
    project,
    deploymentId
);
await statusService.update(
    deploymentId,
    "RUNNING"
);
await dockerService.buildImage({
    imageName: buildPlan.imageName,
    dockerfile: buildPlan.dockerfile,
    context: repository.repository,
    buildContext: buildPlan.buildContext,
    deploymentId
});

const hostPort = Math.floor(Math.random() * 1000) + 9000;

const runtime = await dockerService.runContainer({
    imageName: buildPlan.imageName,
    containerName: `runtime-${deploymentId}`,
    hostPort,
    containerPort: buildPlan.containerPort,
    env,
    deploymentId
});

await registryService.register({
    deploymentId,
    imageName: runtime.imageName,
    containerName: runtime.containerName,
    hostPort: runtime.hostPort,
    containerPort: runtime.containerPort
});
return {
    success: true,
    deploymentId,
    hostPort
};
      }

      logger.deployment(
        io,

        deploymentId,

        "✅ Build Stage Completed.",
      );

      return {
        success: true,

        workspace,

        repository,
      };
    } catch (error) {
      logger.error(error.message);
await statusService.update(
    deploymentId,
    "FAILED"
);
      throw error;
    }
  }
}

module.exports = new DeploymentOrchestrator();
