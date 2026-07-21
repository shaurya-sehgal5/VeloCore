const fs = require("fs");
const path = require("path");

const DEFAULT_DOCKERIGNORE = `
# Git
.git
.gitignore

# Dependencies
node_modules
venv
.venv

# Python
__pycache__
*.pyc
.pytest_cache

# Node
.next
dist
build
coverage

# IDE
.vscode
.idea

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.*
`;

function ensureDockerignore(projectPath) {
    const dockerignorePath = path.join(projectPath, ".dockerignore");

    if (!fs.existsSync(dockerignorePath)) {
        fs.writeFileSync(dockerignorePath, DEFAULT_DOCKERIGNORE.trim() + "\n");
        return true;
    }

    return false;
}

module.exports = {
    ensureDockerignore,
};