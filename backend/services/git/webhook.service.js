const axios = require("axios");
const db = require("../../config/db");
const { decrypt } = require("../../utils/crypto");
const signatureService = require("./signature.service");
const config = require("../../config/env")

class WebhookService {
  async create(projectId) {
    /*
    -----------------------------------
    Get Project
    -----------------------------------
    */

    const { rows } = await db.query(
      `
      SELECT
        p.id,
        p.repo_url,
        p.default_branch,
        u.github_token
      FROM projects p
      JOIN users u
        ON u.id = p.user_id
      WHERE p.id = $1
      `,
      [projectId],
    );

    if (!rows.length) {
      throw new Error("Project not found.");
    }

    const project = rows[0];
    if (project.webhook_id) {
      return {
        success: true,
        webhookId: project.webhook_id,
      };
    }

    /*
    -----------------------------------
    Parse Repository
    -----------------------------------
    */

    const repo = project.repo_url
      .replace("https://github.com/", "")
      .replace(".git", "");

    const secret = signatureService.generateSecret();

    /*
    -----------------------------------
    Create Webhook
    -----------------------------------
    */
    let response;
    const githubToken = decrypt(project.github_token);
    try {
      response = await axios.post(
        `https://api.github.com/repos/${repo}/hooks`,
        {
          name: "web",

          active: true,

          events: ["push"],

          config: {
            url: `${config.PUBLIC_URL}/api/github/webhook`,
            content_type: "json",

            secret,

            insecure_ssl: "0",
          },
        },

        {
          headers: {

            Authorization: `Bearer ${githubToken}`,

            Accept: "application/vnd.github+json",
          },
        },
      );
    } catch (err) {

      if (err.response?.status === 422) {

        const hook = await axios.get(
          `https://api.github.com/repos/${repo}/hooks`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github+json",
            },
          }
        );

        const existing = hook.data.find(
          h =>
            h.config.url ===
            `${config.PUBLIC_URL}/api/github/webhook`
        );

        if (existing) {

          await db.query(
            `
UPDATE projects
SET
    webhook_id=$1,
    webhook_secret=$2,
    auto_deploy=true,
    production_branch=COALESCE(default_branch,'main')
WHERE id=$3
`,
            [
              existing.id,
              secret,
              projectId,
            ]
          );

          await axios.patch(
            `https://api.github.com/repos/${repo}/hooks/${existing.id}`,
            {
              config: {
                url: `${config.PUBLIC_URL}/api/github/webhook`,
                content_type: "json",
                secret,
                insecure_ssl: "0",
              },
              events: ["push"],
              active: true,
            },
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github+json",
              },
            }
          );

          return {
            success: true,
            webhookId: existing.id,
          };
        }
      }

      throw err;
    }

    /*
    -----------------------------------
    Save
    -----------------------------------
    */

    await db.query(
      `
UPDATE projects
SET
    webhook_id=$1,
    webhook_secret=$2,
    auto_deploy=true,
    production_branch=COALESCE(default_branch,'main')
WHERE id=$3
`,
      [
        response.data.id,
        secret,
        projectId,
      ]
    );

    return {
      success: true,
      webhookId: response.data.id,
    };
  }
}

module.exports = new WebhookService();
