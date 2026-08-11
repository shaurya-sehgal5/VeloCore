const fs = require("fs");
const yaml = require("js-yaml");

class ComposeParser {
    parse(file) {
        const compose = yaml.load(
            fs.readFileSync(file, "utf8")
        );

        const services = compose?.services || {};

        return Object.entries(services).map(
            ([name, service]) => ({
                name,

                image: service.image || null,

                build: service.build || null,

                dockerfile:
                    typeof service.build === "object"
                        ? service.build.dockerfile || null
                        : null,

                context:
                    typeof service.build === "object"
                        ? service.build.context || "."
                        : typeof service.build === "string"
                            ? service.build
                            : null,

                dependsOn:
                    Array.isArray(service.depends_on)
                        ? service.depends_on
                        : Object.keys(service.depends_on || {}),

                environment: service.environment || {},

                ports: service.ports || [],

                command: service.command || null,

                workingDir: service.working_dir || null,

                restart: service.restart || null,

                volumes: service.volumes || [],

                networks: service.networks || [],
            })
        );
    }
}

module.exports = new ComposeParser(); 