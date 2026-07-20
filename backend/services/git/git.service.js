const simpleGit = require("simple-git");
const fs = require("fs-extra");
const logger = require("../monitoring/logger.service");

class GitService {
  async clone(repoUrl, githubToken, workspaceDir, targetBranch = "main", deploymentId) {
    await logger.info(
      "SYSTEM",
      "WORKSPACE",
      "Preparing deployment workspace."
    );
    await fs.emptyDir(workspaceDir);

    let authenticatedUrl = repoUrl;
    if (githubToken && repoUrl.startsWith("https://github.com/")) {
      authenticatedUrl = repoUrl.replace(
        "https://github.com/",
        `https://x-token-auth:${githubToken}@github.com/`
      );
    }

    await logger.info(
      "SYSTEM",
      "WORKSPACE",
      `Cloning branch ${targetBranch}`
    );

    await simpleGit().clone(authenticatedUrl, workspaceDir, [
      `--branch=${targetBranch}`,
      "--depth=1",
      "--single-branch",
      "--no-tags",
      "--filter=tree:0",
      "--quiet",
    ]);

    await logger.success(
      "SYSTEM",
      "WORKSPACE",
      "Repository cloned successfully."
    );
    return workspaceDir;
  }
}

module.exports = new GitService();