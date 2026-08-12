const path = require("path");
const fs = require("fs");

function hasDockerCommand(dockerfilePath) {
    if (!dockerfilePath) return false;
    const content = fs.readFileSync(
        dockerfilePath,
        "utf8"
    );
    return /^\s*(CMD|ENTRYPOINT)\s+/mi.test(content);
}

class DockerfileMapper {
    map(repository) {
        for (const project of repository.projects) {
            let bestMatch = null;
            let bestDepth = -1;

            const projectPath = path.resolve(project.path);

            for (const dockerfile of repository.dockerfiles) {
                const dockerDir = path.resolve(
                    path.dirname(dockerfile.path)
                );

                const belongsToProject =
                    dockerDir === projectPath ||
                    dockerDir.startsWith(projectPath + path.sep);

                if (!belongsToProject) {
                    continue;
                }

                const depth = dockerDir.split(path.sep).length;

                if (depth > bestDepth) {
                    bestDepth = depth;
                    bestMatch = dockerfile;
                }
            }

            if (bestMatch) {
                project.useCustomDockerfile = true;
                project.dockerfile = bestMatch.path;
                project.buildContext = bestMatch.context;

                project.hasDockerCommand = hasDockerCommand(
                    bestMatch.path
                );
            } else {
                project.useCustomDockerfile = false;
                project.dockerfile = null;
                project.buildContext = project.path;
                project.hasDockerCommand = false;
            }
        }
        return repository;
    }
}

module.exports = new DockerfileMapper();