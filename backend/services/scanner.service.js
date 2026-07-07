const fs = require("fs");
const path = require("path");

function detectFramework(packageJson = {}) {

    const deps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
    };

    if (deps.react && deps.vite) {
        return {
            framework: "vite-react",
            type: "frontend"
        };
    }

    if (deps.next) {
        return {
            framework: "nextjs",
            type: "frontend"
        };
    }

    if (deps.vue) {
        return {
            framework: "vue",
            type: "frontend"
        };
    }

    if (deps.express) {
        return {
            framework: "express",
            type: "backend"
        };
    }

    if (deps["@nestjs/core"]) {
        return {
            framework: "nestjs",
            type: "backend"
        };
    }

    return {
        framework: "unknown",
        type: "unknown"
    };

}

function detectPackageManager(projectPath) {

    if (fs.existsSync(path.join(projectPath, "pnpm-lock.yaml")))
        return "pnpm";

    if (fs.existsSync(path.join(projectPath, "yarn.lock")))
        return "yarn";

    return "npm";

}

function scanDirectory(rootPath, result) {

    const entries = fs.readdirSync(rootPath);

    if (entries.includes("package.json")) {

        const packageJson = JSON.parse(
            fs.readFileSync(
                path.join(rootPath, "package.json"),
                "utf8"
            )
        );

        const detected = detectFramework(packageJson);

        if (detected.type !== "unknown") {

            result.projects.push({

                name: packageJson.name,

                path: rootPath,

                repositoryRoot: result.repository,

                framework: detected.framework,

                type: detected.type,

                packageManager: detectPackageManager(rootPath),

                scripts: packageJson.scripts || {},

                startCommand: packageJson.scripts?.start || null,

                containerPort:
                    detected.type === "backend"
                        ? (process.env.DEFAULT_BACKEND_PORT || 8080)
                        : 80

            });

        }

    }

    for (const entry of entries) {

        if (
            [
                "node_modules",
                ".git",
                "dist",
                "build"
            ].includes(entry)
        ) continue;

        const fullPath = path.join(rootPath, entry);

        if (fs.statSync(fullPath).isDirectory()) {
            scanDirectory(fullPath, result);
        }

    }

}

function scanRepository(repositoryPath) {

    const result = {

        repository: repositoryPath,

        dockerfile: fs.existsSync(
            path.join(repositoryPath, "Dockerfile")
        ),

        dockerCompose: fs.existsSync(
            path.join(repositoryPath, "docker-compose.yml")
        ),

        projects: []

    };

    scanDirectory(repositoryPath, result);

    return result;

}

module.exports = {
    scanRepository
};