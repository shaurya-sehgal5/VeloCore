const path = require("path");

class DockerfileMapper {

    map(repository) {

        for (const project of repository.projects) {

            let bestMatch = null;
            let bestDepth = -1;

            for (const dockerfile of repository.dockerfiles) {

                const dockerDir = path.dirname(dockerfile.path);

                if (
                    project.path.startsWith(dockerDir) ||
                    dockerDir.startsWith(project.path)
                ) {

                    const depth = dockerDir.split(path.sep).length;

                    if (depth > bestDepth) {

                        bestDepth = depth;
                        bestMatch = dockerfile;

                    }

                }

            }

            if (bestMatch) {

                project.useCustomDockerfile = true;
                project.dockerfile = bestMatch.path;
                project.buildContext = bestMatch.context;

            } else {

                project.useCustomDockerfile = false;
                project.dockerfile = null;
                project.buildContext = project.path;

            }

        }

        return repository;

    }

}

module.exports = new DockerfileMapper();