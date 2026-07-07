class DeploymentPlanService {

    create(graph) {

        const plan = [];

        /*
        ----------------------------
        Backend
        ----------------------------
        */

        if (graph.backend) {

            plan.push({

                stage: "backend",

                parallel: false,

                nodes: [graph.backend]

            });

        }

        /*
        ----------------------------
        Workers
        ----------------------------
        */

        if (graph.workers.length) {

            plan.push({

                stage: "workers",

                parallel: true,

                nodes: graph.workers

            });

        }

        /*
        ----------------------------
        Frontend
        ----------------------------
        */

        if (graph.frontend) {

            plan.push({

                stage: "frontend",

                parallel: false,

                nodes: [graph.frontend]

            });

        }

        return plan;

    }

}

module.exports = new DeploymentPlanService();