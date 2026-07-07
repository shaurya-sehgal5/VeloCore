class GraphBuilder {
  build(repository) {
    const graph = {
      repository: repository.repository,

      dockerfile: repository.dockerfile,

      dockerCompose: repository.dockerCompose,

      nodes: [],

      edges: [],
    };

    for (const project of repository.projects) {
      graph.nodes.push({
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
      });
    }

    return graph;
  }
}

module.exports = new GraphBuilder();
