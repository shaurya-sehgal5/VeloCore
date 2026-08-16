const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { buildQueue } = require("../queues/build.queue");
const webhookService = require("../services/git/webhook.service");
const { decrypt } = require("../utils/crypto");


// ---------------------------------------------------------
// Get authenticated user's GitHub token
// ---------------------------------------------------------

async function getGitHubToken(userId) {
  if (!userId) {
    throw new Error("Authenticated user missing.");
  }

  const { rows } = await db.query(
    `SELECT github_token FROM users WHERE id = $1`,
    [userId]
  );

  if (!rows.length || !rows[0].github_token) {
    throw new Error("GitHub authentication token not found.");
  }

  const githubToken = decrypt(rows[0].github_token);

  if (!githubToken) {
    throw new Error("Unable to decrypt GitHub authentication token.");
  }

  return githubToken;
}


// ---------------------------------------------------------
// Get user's GitHub repositories
// ---------------------------------------------------------

exports.getUserRepositories = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const githubToken = await getGitHubToken(userId);

    const response = await axios.get(
      "https://api.github.com/user/repos",
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "VeloCore-Engine",
        },
        params: {
          per_page: 30,
          sort: "updated",
          direction: "desc",
        },
      }
    );

    return res.status(200).json(response.data);

  } catch (err) {
    console.error(
      "[GitHub Repositories Error]",
      err.message
    );

    return res.status(500).json({
      error: "Failed to synchronize repository configuration listings.",
    });
  }
};


// ---------------------------------------------------------
// Deploy project
// ---------------------------------------------------------

exports.deployProject = async (req, res) => {
  try {
    const {
      repoName,
      cloneUrl,
      envVars,
      projectId,
    } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Authenticated user missing.",
      });
    }

    if (!repoName || !cloneUrl) {
      return res.status(400).json({
        error: "repoName and cloneUrl required.",
      });
    }

    const githubToken = await getGitHubToken(userId);

    const deploymentId = uuidv4();

    let finalProjectId = projectId;


    // -----------------------------------------------------
    // Create project if it doesn't already exist
    // -----------------------------------------------------

    if (!finalProjectId) {
      const { rows } = await db.query(
        `
        INSERT INTO projects
        (
          user_id,
          name,
          repo_url,
          branch
        )
        VALUES
        (
          $1,
          $2,
          $3,
          'main'
        )
        RETURNING id
        `,
        [
          userId,
          repoName,
          cloneUrl,
        ]
      );

      finalProjectId = rows[0].id;

      await webhookService.create(
        finalProjectId
      );
    }


    // -----------------------------------------------------
    // Make sure webhook exists
    // -----------------------------------------------------

    const { rows: projectRows } = await db.query(
      `
      SELECT webhook_id
      FROM projects
      WHERE id = $1
      `,
      [finalProjectId]
    );

    if (!projectRows.length) {
      return res.status(404).json({
        error: "Project not found.",
      });
    }

    if (!projectRows[0].webhook_id) {
      await webhookService.create(
        finalProjectId
      );
    }


    // -----------------------------------------------------
    // Create deployment record
    // -----------------------------------------------------

    await db.query(
      `
      INSERT INTO deployments
      (
        id,
        project_id,
        user_id,
        repo_name,
        repo_url,
        status,
        deploy_url,
        created_at,
        updated_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        'QUEUED',
        NULL,
        NOW(),
        NOW()
      )
      `,
      [
        deploymentId,
        finalProjectId,
        userId,
        repoName,
        cloneUrl,
      ]
    );


    // -----------------------------------------------------
    // Queue deployment
    // -----------------------------------------------------

    await buildQueue.add(
      "deployment",
      {
        deploymentId,
        cloneUrl,
        githubToken,

        env: envVars || {},
      },
      {
        jobId: deploymentId,
        removeOnComplete: 20,
        removeOnFail: 20,
      }
    );


    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return res.status(202).json({
      success: true,
      deploymentId,
      url: null,
      status: "QUEUED",
    });

  } catch (err) {
    console.error(
      "[Deployment Error]",
      err.message
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}; 