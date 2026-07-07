class DependencyAnalyzer {

    analyze(graph) {

        graph.frontend = null;
        graph.backend = null;
        graph.workers = [];

        for (const node of graph.nodes) {

            switch (node.type) {

                case "frontend":

                    graph.frontend = node;

                    break;

                case "backend":

                    graph.backend = node;

                    break;

                case "worker":

                    graph.workers.push(node);

                    break;

            }

        }

        return graph;

    }

}

module.exports = new DependencyAnalyzer();