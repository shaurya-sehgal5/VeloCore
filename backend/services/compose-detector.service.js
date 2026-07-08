const fs = require("fs");
const path = require("path");

class ComposeDetector {

    detect(repository) {

        const files = [
            "docker-compose.yml",
            "docker-compose.yaml",
            "compose.yml",
            "compose.yaml"
        ];

        for (const file of files) {

            const full = path.join(repository.repository, file);

            if (fs.existsSync(full)) {
                return full;
            }

        }

        return null;

    }

}

module.exports = new ComposeDetector();