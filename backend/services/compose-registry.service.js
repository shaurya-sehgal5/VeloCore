class ComposeRegistry {

    constructor() {

        this.services = new Map();

    }

    register(deploymentId, services) {

        this.services.set(
            deploymentId,
            services
        );

    }

    get(deploymentId) {

        return this.services.get(
            deploymentId
        );

    }

    remove(deploymentId) {

        this.services.delete(
            deploymentId
        );

    }

}

module.exports = new ComposeRegistry();