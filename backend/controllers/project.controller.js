const db = require("../config/db");

const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const path = require("path");
const { buildQueue } = require("../queues/build.queue");

exports.getUserRepositories = async (req, res) => {
  try {
    const githubToken = req.user?.githubToken;
    if (!githubToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Linked GitHub session token missing." });
    }

    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: { per_page: 10, sort: "updated", direction: "desc" },
    });
    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to synchronize repository configuration listings.",
    });
  }
};

exports.deployProject = async (req, res) => {
  try {
    const {
      repoName,

      cloneUrl,

      envVars,

      projectId,
    } = req.body;

    const userId = req.user?.userId;

    const githubToken = req.user?.githubToken;

    if (!repoName || !cloneUrl) {
      return res.status(400).json({
        error: "repoName and cloneUrl required.",
      });
    }

    const deploymentId = uuidv4();
    const deploymentUrl = `http://localhost:8000/visit/${deploymentId}`;

    await db.query(
      `
    INSERT INTO deployments (
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
    VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'QUEUED',
        $6,
        NOW(),
        NOW()
    )
    `,
      [
        deploymentId,
        projectId || null,
        userId,
        repoName,
        cloneUrl,
        deploymentUrl,
      ],
    );

    await buildQueue.add(
      "deployment",

      {
        deploymentId,

        cloneUrl,

        githubToken,

        env: envVars || {},
      },
    );

    return res.status(202).json({
      success: true,

      deploymentId,

      url: deploymentUrl,

      status: "QUEUED",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,

      error: err.message,
    });
  }
};
