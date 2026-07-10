const fs = require("fs-extra");
const path = require("path");
const { randomUUID } = require("crypto");

const WORKSPACE_ROOT = path.join(
    __dirname,
    "../workspaces"
);

class WorkspaceService {

    async create() {

        const workspaceId = randomUUID();

        const workspacePath = path.join(
            WORKSPACE_ROOT,
            workspaceId
        );

        await fs.ensureDir(workspacePath);

        return {

            id: workspaceId,

            path: workspacePath

        };

    }

    async remove(workspacePath) {

        await fs.remove(workspacePath);

    }

}

module.exports = new WorkspaceService();