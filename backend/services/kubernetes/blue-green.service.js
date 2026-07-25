const kubectl = require("./kubectl.service");

class BlueGreenService {

    async getActiveSlot(projectName, namespace) {

        try {

            const service = await kubectl.getService(
                projectName,
                namespace
            );

            return (
                service.spec.selector.slot ||
                "blue"
            );

        } catch {

            return "blue";

        }

    }

    getNextSlot(activeSlot) {

        return activeSlot === "blue"
            ? "green"
            : "blue";

    }

}

module.exports = new BlueGreenService();