const simpleGit = require("simple-git");
const fs = require("fs-extra");

const logger = require("../monitoring/logger.service");

class GitService {

    async clone(repoUrl, githubToken, workspaceDir) {

        logger.info(`Preparing workspace ${workspaceDir}`);

        await fs.ensureDir(workspaceDir);

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

        const git = simpleGit();

        logger.info("Cloning repository...");

        await git.clone(
            authenticatedUrl,
            workspaceDir,
            ["--depth=1"]
        );

        logger.success("Repository cloned.");

        return workspaceDir;

    }

}

module.exports = new GitService();