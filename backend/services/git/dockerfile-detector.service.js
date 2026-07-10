const fs = require("fs");
const path = require("path");

class DockerfileDetector {

    detect(repository) {

        const dockerfile = path.join(
            repository.repository,
            "Dockerfile"
        );

        return fs.existsSync(dockerfile)
            ? dockerfile
            : null;

    }

}

module.exports = new DockerfileDetector();