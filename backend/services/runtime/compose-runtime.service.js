class ComposeRuntime {

    constructor() {

        this.deployments = new Map();

    }

    register(deploymentId, compose) {

        this.deployments.set(
            deploymentId,
            compose
        );

    }

    get(deploymentId) {

        return this.deployments.get(
            deploymentId
        );

    }

    remove(deploymentId) {

        this.deployments.delete(
            deploymentId
        );

    }

}

module.exports = new ComposeRuntime();