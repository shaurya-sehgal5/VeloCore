class DependencyAnalyzer {
    analyze(graph) {
        graph.frontend = null;
        graph.backend = null;
        graph.workers = [];

        // Existing detected application nodes
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

        // --------------------------------------------------
        // Compose dependency analysis
        // --------------------------------------------------

        graph.dependencies = {};

        for (const service of graph.composeServices || []) {
            graph.dependencies[service.name] = {
                dependsOn: service.dependsOn || [],
                image: service.image || null,
                environment: service.environment || {},
            };
        }

        // --------------------------------------------------
        // Attach Compose dependencies to detected nodes
        // --------------------------------------------------

        for (const node of graph.nodes) {
            const composeService = (
                graph.composeServices || []
            ).find(
                service =>
                    service.name === node.name
            );

            if (!composeService) {
                continue;
            }

            node.dependsOn =
                composeService.dependsOn || [];

            node.composeService =
                composeService;
        }

        // --------------------------------------------------
        // Detect worker services from Compose
        // --------------------------------------------------

        for (const service of graph.composeServices || []) {
            const name = service.name.toLowerCase();

            const isWorker =
                name.includes("worker") ||
                name.includes("queue") ||
                name.includes("bull");

            if (!isWorker) {
                continue;
            }

            const existing = graph.workers.find(
                worker =>
                    worker.name === service.name
            );

            if (!existing) {
                graph.workers.push({
                    id: service.name,
                    name: service.name,
                    type: "worker",
                    framework: "bullmq",
                    dependsOn:
                        service.dependsOn || [],
                    command: service.command || null,
                    image: service.image || null,
                });
            }
        }

        // --------------------------------------------------
        // Detect infrastructure dependencies
        // --------------------------------------------------

        graph.infrastructure =
            graph.infrastructure || [];

        for (const service of graph.composeServices || []) {
            const image = String(
                service.image || ""
            ).toLowerCase();

            const isInfrastructure =
                image.startsWith("redis:") ||
                image === "redis" ||
                image.startsWith("postgres:") ||
                image === "postgres" ||
                image.startsWith("mysql:") ||
                image === "mysql" ||
                image.startsWith("mariadb:") ||
                image === "mariadb" ||
                image.startsWith("mongo:") ||
                image === "mongo" ||
                image.startsWith("mongodb:");

            if (
                isInfrastructure &&
                !graph.infrastructure.some(
                    item =>
                        item.name === service.name
                )
            ) {
                graph.infrastructure.push(service);
            }
        }

        return graph;
    }
}

module.exports = new DependencyAnalyzer();