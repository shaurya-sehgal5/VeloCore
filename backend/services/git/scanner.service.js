const fs = require("fs");
const path = require("path");

function getContainerPort(framework) {
  switch (framework) {
    case "nextjs":
      return 3000;

    case "vite-react":
    case "react":
    case "vue":
      return 80;

    case "express":
    case "nestjs":
      return 8080;

    case "python":
    case "fastapi":
    case "flask":
      return 8000;

    default:
      return 8080;
  }
}

function detectFramework(projectPath, packageJson = {}) {
  const deps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };

  // ---------- Frontend ----------

  if (
    deps.next ||
    fs.existsSync(path.join(projectPath, "next.config.js")) ||
    fs.existsSync(path.join(projectPath, "next.config.mjs")) ||
    fs.existsSync(path.join(projectPath, "next.config.ts"))
  ) {
    return {
      framework: "nextjs",
      language: "node",
      type: "frontend",
      output: ".next",
    };
  }

  if (deps.react && deps.vite) {
    return {
      framework: "vite-react",
      language: "node",
      type: "frontend",
      output: "dist",
    };
  }

  if (deps.react) {
    return {
      framework: "react",
      language: "node",
      type: "frontend",
      output: "build",
    };
  }

  if (deps.vue) {
    return {
      framework: "vue",
      language: "node",
      type: "frontend",
      output: "dist",
    };
  }

  // ---------- Backend ----------

  if (deps["@nestjs/core"]) {
    return {
      framework: "nestjs",
      language: "node",
      type: "backend",
    };
  }

  if (deps.express) {
    return {
      framework: "express",
      language: "node",
      type: "backend",
    };
  }

  // ---------- Python ----------

  const requirements = fs.existsSync(
    path.join(projectPath, "requirements.txt")
  )
    ? fs.readFileSync(
        path.join(projectPath, "requirements.txt"),
        "utf8"
      )
    : "";

  if (requirements.includes("fastapi")) {
    return {
      framework: "fastapi",
      language: "python",
      type: "backend",
    };
  }

  if (requirements.includes("flask")) {
    return {
      framework: "flask",
      language: "python",
      type: "backend",
    };
  }

  if (
    fs.existsSync(path.join(projectPath, "requirements.txt")) ||
    fs.existsSync(path.join(projectPath, "pyproject.toml"))
  ) {
    return {
      framework: "python",
      language: "python",
      type: "backend",
    };
  }

  return {
    framework: "unknown",
    language: "unknown",
    type: "unknown",
  };
}

function detectPackageManager(projectPath) {
  if (fs.existsSync(path.join(projectPath, "requirements.txt")))
    return "pip";

  if (fs.existsSync(path.join(projectPath, "pyproject.toml")))
    return "poetry";

  if (fs.existsSync(path.join(projectPath, "pnpm-lock.yaml")))
    return "pnpm";

  if (fs.existsSync(path.join(projectPath, "yarn.lock")))
    return "yarn";

  return "npm";
}

function scanDirectory(rootPath, result) {
  const entries = fs.readdirSync(rootPath);

  // ---------- Detect Dockerfile ----------

  if (entries.includes("Dockerfile")) {
    result.dockerfiles.push({
      path: path.join(rootPath, "Dockerfile"),
      context: rootPath,
    });
  }

  // ---------- Node Projects ----------

  if (entries.includes("package.json")) {
    const packageJson = JSON.parse(
      fs.readFileSync(
        path.join(rootPath, "package.json"),
        "utf8"
      )
    );

    const detected = detectFramework(rootPath, packageJson);

    if (detected.type !== "unknown") {
      result.projects.push({
        name: packageJson.name,

        path: rootPath,

        repositoryRoot: result.repository,

        framework: detected.framework,

        type: detected.type,

        language: detected.language,

        outputDirectory: detected.output ?? null,

        packageManager: detectPackageManager(rootPath),

        scripts: packageJson.scripts || {},

        startCommand: packageJson.scripts?.start || null,

        containerPort: getContainerPort(detected.framework),
      });
    }
  }

  // ---------- Python Projects ----------

  if (
    !entries.includes("package.json") &&
    (
      entries.includes("requirements.txt") ||
      entries.includes("pyproject.toml")
    )
  ) {
    const detected = detectFramework(rootPath);

    result.projects.push({
      name: path.basename(rootPath),

      path: rootPath,

      repositoryRoot: result.repository,

      framework: detected.framework,

      type: detected.type,

      language: detected.language,

      outputDirectory: null,

      packageManager: detectPackageManager(rootPath),

      scripts: {},

      startCommand: null,

      containerPort: getContainerPort(detected.framework),
    });
  }

  // ---------- Recurse ----------

  for (const entry of entries) {
    if (
      [
        ".git",
        "node_modules",
        "dist",
        "build",
        ".next",
        ".turbo",
        ".venv",
        "venv",
        "__pycache__",
      ].includes(entry)
    ) {
      continue;
    }

    const fullPath = path.join(rootPath, entry);

    if (fs.statSync(fullPath).isDirectory()) {
      scanDirectory(fullPath, result);
    }
  }
}

function scanRepository(repositoryPath) {
  const result = {
    repository: repositoryPath,
    dockerCompose: null,
    dockerfiles: [],
    projects: [],
  };

  scanDirectory(repositoryPath, result);

  for (const file of [
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
  ]) {
    const full = path.join(repositoryPath, file);

    if (fs.existsSync(full)) {
      result.dockerCompose = full;
      break;
    }
  }

  result.dockerfile = result.dockerfiles.length > 0;

  return result;
}

module.exports = {
  scanRepository,
};