const graphBuilder = require("./graph-builder.service");
const dependencyAnalyzer = require("./dependency-analyzer.service");
const graphValidator = require("./graph-validator.service");
const deploymentOrderService = require("./deployment-order.service");
const deploymentPlanService = require("./deployment-plan.service");
const dockerfileMapper = require("../git/dockerfile-mapper.service");

class RepositoryGraphService {
  build(repository) {
    repository = dockerfileMapper.map(repository);

    let graph = graphBuilder.build(repository);
    graph.composeServices = [];
    graph.infrastructure = [];
    graph.workloads = [];
    if (graph.composeFile) {
      const composeParser = require("./compose-parser.service");

      const services = composeParser.parse(
        graph.composeFile
      );

      graph.composeServices = services;

      const infrastructureImages = [
        "redis",
        "postgres",
        "postgresql",
        "mysql",
        "mariadb",
        "mongodb",
        "mongo",
      ];

      for (const service of services) {
        const image = String(
          service.image || ""
        ).toLowerCase();

        const isInfrastructure =
          infrastructureImages.some(
            name =>
              image === name ||
              image.startsWith(`${name}:`) ||
              image.startsWith(`${name}@`)
          );

        if (isInfrastructure) {
          graph.infrastructure.push(service);
        } else {
          graph.workloads.push(service);
        }
      }
    }
    graph.customDockerfile = repository.dockerfile;
    graph.hasDockerfile = repository.dockerfile;
    graph.composeFile = repository.dockerCompose;
    graph.hasCompose = !!repository.dockerCompose;

    graph = dependencyAnalyzer.analyze(graph);
    console.log(
      JSON.stringify(
        {
          frontend: graph.frontend?.name,
          backend: graph.backend?.name,

          workers: graph.workers?.map(
            worker => ({
              name: worker.name,
              type: worker.type,
              dependsOn: worker.dependsOn,
            })
          ),

          infrastructure:
            graph.infrastructure?.map(
              service => ({
                name: service.name,
                image: service.image,
              })
            ),

          dependencies: graph.dependencies,
        },
        null,
        2
      )
    );
    if (graph.workers) {
      graph.workers = graph.workers.filter(Boolean);
    } else {
      graph.workers = [];
    }

    graphValidator.validate(graph);

    graph.deploymentOrder = deploymentOrderService.build(graph);

    graph.deploymentPlan = deploymentPlanService.create(graph);

    return graph;
  }
}

module.exports = new RepositoryGraphService();
