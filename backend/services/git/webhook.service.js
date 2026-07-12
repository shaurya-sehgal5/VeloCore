const axios = require("axios");
const db = require("../../config/db");
const { decrypt } = require("../../utils/crypto");
const signatureService = require("./signature.service");


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
            url: `${process.env.PUBLIC_URL}/api/github/webhook`,
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
      console.error(err.response?.status);
      console.error(err.response?.data);
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
        webhook_secret=$2
      WHERE id=$3
      `,
      [response.data.id, secret, projectId],
    );

    return {
      success: true,
      webhookId: response.data.id,
    };
  }
}

module.exports = new WebhookService();
