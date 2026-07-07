const path = require("path");

class BuilderService {
  createBuildPlan(project, deploymentId) {
    const imageName = `velocore-${deploymentId}`;

    switch (project.framework) {
      case "vite-react":
        return {
          type: "frontend",

          imageName,

          dockerfile: path.join(__dirname, "../templates/Frontend.Dockerfile"),

          buildContext: path.relative(project.repositoryRoot, project.path),

          containerPort: 80,

          startCommand: project.startCommand,
        };
      case "express":
        return {
          type: "backend",

          imageName,

          dockerfile: path.join(__dirname, "../templates/Backend.Dockerfile"),

          buildContext: path.relative(project.repositoryRoot, project.path),

          containerPort: project.containerPort,

          startCommand: project.startCommand,
        };
      case "bullmq":
        return {
          type: "worker",

          imageName,

          dockerfile: path.join(__dirname, "../templates/Backend.Dockerfile"),

          buildContext: path.relative(project.repositoryRoot, project.path),

          containerPort: 8080,

          containerPort: project.containerPort,

          startCommand: project.startCommand,
        };

      default:
        throw new Error(`Unsupported framework: ${project.framework}`);
    }
  }
}

module.exports = new BuilderService();
