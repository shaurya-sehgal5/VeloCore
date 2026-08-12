class GraphBuilder {
  build(repository) {
    const graph = {
      repository: repository.repository,
      dockerfile: repository.dockerfile,
      dockerCompose: repository.dockerCompose,
      nodes: [],
      edges: [],
    };

    const backend = repository.projects.find(
      project => project.type === "backend"
    );

    for (const project of repository.projects) {
      const node = {
        dockerfile: project.dockerfile,
        buildContext: project.buildContext,
        useCustomDockerfile: project.useCustomDockerfile,

        id: project.name,
        name: project.name,
        path: project.path,
        repositoryRoot: project.repositoryRoot,

        framework: project.framework,
        type: project.type,
        packageManager: project.packageManager,
        scripts: project.scripts,
        startCommand: project.startCommand,
        containerPort: project.containerPort,
      };

      graph.nodes.push(node);
    }

    if (backend) {
      for (const project of repository.projects) {
        if (project.type === "frontend") {
          graph.edges.push({
            from: project.name,
            to: backend.name,
            type: "http",
          });
        }
      }
    }

    return graph;
  }
}

module.exports = new GraphBuilder();