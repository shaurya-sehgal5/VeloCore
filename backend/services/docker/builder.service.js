const path = require("path");
const config = require("../../config/env")

class BuilderService {
  createBuildPlan(project, deploymentId, slot = "blue") {
    const projectName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const imageTag = deploymentId.substring(0, 8);

    const DOCKER_NAMESPACE = config.DOCKER_NAMESPACE || "shauryasehgal";

    const imageName =
      `${DOCKER_NAMESPACE}/velocore-${projectName}:${imageTag}-${slot}`;
    const common = {
      projectName,
      imageName,
      containerName: `runtime-${projectName}-${slot}`,
      containerPort: project.containerPort,
      startCommand: project.startCommand,
      framework: project.framework,
      slot,
      deploymentId,
      host: null,
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
            "../../templates/Frontend.Dockerfile"
          ),
          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      case "nextjs":
        return {
          ...common,
          type: "frontend",
          containerPort: 3000,
          dockerfile: path.join(
            __dirname,
            "../../templates/Nextjs.Dockerfile"
          ),
          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      case "express":
      case "nestjs":
        return {
          ...common,
          type: "backend",
          dockerfile: path.join(
            __dirname,
            "../../templates/Backend.Dockerfile"
          ),
          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      case "python":
        return {
          ...common,
          type: "backend",
          containerPort: 8000,
          dockerfile: path.join(
            __dirname,
            "../../templates/Python.Dockerfile"
          ),
          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      case "bullmq":
        return {
          ...common,
          type: "worker",
          dockerfile: path.join(
            __dirname,
            "../../templates/Backend.Dockerfile"
          ),
          buildContext: path.relative(project.repositoryRoot, project.path),
        };

      default:
        throw new Error(`Unsupported framework: ${project.framework}`);
    }
  }
  createRollbackPlan(runtime) {
    return {
      projectName: runtime.name,
      imageName: runtime.image_name,
      namespace: runtime.namespace,
      framework: runtime.framework,
      type: runtime.type,
      slot: runtime.slot,
      containerPort: runtime.container_port,

      healthCheck: "/health",

      secrets: {},

      customDomain: null,

      enableTLS: true,

      scaling: {
        min: 1,
        max: 2,
        cpu: 80,
      },

      useIngress: false,
    };
  }
}

module.exports = new BuilderService();
