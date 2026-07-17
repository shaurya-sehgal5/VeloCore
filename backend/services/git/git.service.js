const simpleGit = require("simple-git");
const fs = require("fs-extra");

const logger = require("../monitoring/logger.service");

class GitService {

    async clone(repoUrl, githubToken, workspaceDir) {
        logger.info(`Preparing workspace ${workspaceDir}`);

        await fs.emptyDir(workspaceDir);

        let authenticatedUrl = repoUrl;

        if (
            githubToken &&
            repoUrl.startsWith("https://github.com/")
        ) {
            authenticatedUrl = repoUrl.replace(
                "https://github.com/",
                `https://x-token-auth:${githubToken}@github.com/`
            );
        }

        logger.info("Cloning repository...");

        await simpleGit().clone(
            authenticatedUrl,
            workspaceDir,
            [
                "--depth=1",
                "--single-branch",
                "--no-tags",
                "--filter=tree:0",
                "--quiet",
            ]
        );

        logger.success("Repository cloned.");

        return workspaceDir;
    }

}

module.exports = new GitService();