class GraphValidator {

    validate(graph) {

        if (graph.nodes.length === 0) {

            throw new Error(
                "Repository contains no deployable applications."
            );

        }

        return true;

    }

}

module.exports = new GraphValidator();