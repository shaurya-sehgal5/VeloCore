const simpleGit = require("simple-git");
const fs = require("fs-extra");
const logger = require("../monitoring/logger.service");

class GitService {
  async clone(repoUrl, githubToken, workspaceDir, targetBranch = "main") {
    logger.info(`Preparing clean staging deployment workspace at: ${workspaceDir}`);
    await fs.emptyDir(workspaceDir);

    let authenticatedUrl = repoUrl;
    if (githubToken && repoUrl.startsWith("https://github.com/")) {
      authenticatedUrl = repoUrl.replace(
        "https://github.com/",
        `https://x-token-auth:${githubToken}@github.com/`
      );
    }

    logger.info(`Initiating rapid repository clone for branch: [${targetBranch}]...`);

    await simpleGit().clone(authenticatedUrl, workspaceDir, [
      `--branch=${targetBranch}`, 
      "--depth=1",
      "--single-branch",
      "--no-tags",
      "--filter=tree:0",
      "--quiet",
    ]);

    logger.success("Target repository successfully cloned into staging workspace area.");
    return workspaceDir;
  }
}

module.exports = new GitService();