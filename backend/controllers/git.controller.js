const db = require("../config/db");
const webhookService = require("../services/git/webhook.service");

exports.getSettings = async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT
        auto_deploy,
        default_branch,
        webhook_id,
        last_commit_sha,
        last_commit_message,
        last_commit_author,
        last_deployed_commit
      FROM projects
      WHERE id = $1
      `,
      [req.params.projectId],
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    const project = rows[0];

    res.json({
      autoDeploy: project.auto_deploy,
      defaultBranch: project.default_branch,
      lastCommitSha: project.last_commit_sha,
      lastCommitMessage: project.last_commit_message,
      lastCommitAuthor: project.last_commit_author,
      lastDeployedCommit: project.last_deployed_commit,
      webhookConfigured: !!project.webhook_id,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};
exports.updateSettings = async (req, res) => {
  try {
    const { autoDeploy, defaultBranch } = req.body;

    await db.query(
      `
      UPDATE projects
      SET
        auto_deploy = $1,
        default_branch = $2
      WHERE id = $3
      `,
      [autoDeploy, defaultBranch, req.params.projectId],
    );

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};


exports.createWebhook = async (req, res) => {
  try {
    const result =
      await webhookService.create(
        req.params.projectId
      );

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};