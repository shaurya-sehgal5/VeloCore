class DeploymentOrderService {

    build(graph) {

        const order = [];

        if (graph.backend) {

            order.push(graph.backend);

        }

        graph.workers.forEach(worker => {

            order.push(worker);

        });

        if (graph.frontend) {

            order.push(graph.frontend);

        }

        return order;

    }

}

module.exports = new DeploymentOrderService();