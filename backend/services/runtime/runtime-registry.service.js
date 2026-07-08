class RuntimeRegistry {

    constructor() {

        this.runtimes = new Map();

    }

    add(runtime) {

        this.runtimes.set(

            runtime.deploymentId,

            runtime

        );

    }

    get(id) {

        return this.runtimes.get(id);

    }

    remove(id) {

        this.runtimes.delete(id);

    }

}

module.exports = new RuntimeRegistry();