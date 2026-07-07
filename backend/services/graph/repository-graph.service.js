const graphBuilder = require("./graph-builder.service");
const dependencyAnalyzer = require("./dependency-analyzer.service");
const graphValidator = require("./graph-validator.service");
const deploymentOrderService = require("./deployment-order.service");
const deploymentPlanService = require("./deployment-plan.service");

class RepositoryGraphService {

    build(repository) {

        let graph = graphBuilder.build(repository);

        graph = dependencyAnalyzer.analyze(graph);

        graphValidator.validate(graph);

        graph.deploymentOrder =
            deploymentOrderService.build(graph);

        graph.deploymentPlan =
            deploymentPlanService.create(graph);

        return graph;

    }

}

module.exports = new RepositoryGraphService();