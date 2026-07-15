const path = require("path");

class BuilderService {
  createBuildPlan(project, deploymentId, slot = "blue") {
    const projectName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const imageName = `velocore-${projectName}-${deploymentId}-${slot}`;

    const common = {
      projectName,
      imageName,
      containerName: `runtime-${deploymentId}-${projectName}-${slot}`,
      containerPort: project.containerPort,
      startCommand: project.startCommand,
      framework: project.framework,
      slot,
      host: `${projectName}.velocore.local`,
      persistentVolume: false,
      storage: "1Gi",
      namespace: `velocore-${deploymentId}`,
      customDomain: null,
      enableTLS: true,
    };

    /*
    ------------------------------------
    Custom Dockerfile
    ------------------------------------
    */

    if (project.useCustomDockerfile) {
      return {
        ...common,

        type: project.type,

        dockerfile: project.dockerfile,

        buildContext: path.relative(
          project.repositoryRoot,
          project.buildContext,
        ),
      };
    }

    /*
    ------------------------------------
    Framework Templates
    ------------------------------------
    */

    switch (project.framework) {
      case "vite-react":
        return {
          ...common,

          type: "frontend",

          dockerfile: path.join(
            __dirname,
            "../../templates/Frontend.Dockerfile",
          ),

          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      case "express":
        return {
          ...common,

          type: "backend",

          dockerfile: path.join(
            __dirname,
            "../../templates/Backend.Dockerfile",
          ),

          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      case "bullmq":
        return {
          ...common,

          type: "worker",

          dockerfile: path.join(
            __dirname,
            "../../templates/Backend.Dockerfile",
          ),

          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      default:
        throw new Error(`Unsupported framework: ${project.framework}`);
    }
  }
}

module.exports = new BuilderService();
