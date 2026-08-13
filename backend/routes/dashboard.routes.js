const express = require('express');
const router = express.Router();
const db = require('../config/db');
const secureShield = require('../middleware/auth.middleware');
const config = require("../config/env");

//  NEW: Dynamic authenticated analytics list lookup (No hardcoded IDs needed)
router.get('/analytics-list', secureShield, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      `
 SELECT DISTINCT ON (d.project_id)

    d.*,

    COALESCE(p.name,d.repo_name) AS project_name,

    ds.framework,

    ds.engine,

    ds.image_name,

    ds.namespace,

    ds.slot,

    ds.route,

    ds.container_name,

    ds.deployment_name,

    ds.service_name
    FROM deployments d
    LEFT JOIN projects p
    ON d.project_id = p.id
    LEFT JOIN LATERAL (
    SELECT *
    FROM deployment_services
    WHERE deployment_id = d.id
    ORDER BY
      CASE
        WHEN type='backend' THEN 1
        WHEN type='worker' THEN 2
        ELSE 3
      END
    LIMIT 1
    ) ds ON true
    WHERE d.user_id = $1
    ORDER BY d.project_id, d.created_at DESC
    `,
      [userId]
    );




    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
router.get("/deployment-history/:projectId", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        id,
        status,
        created_at,
        deploy_url,
        active_slot,
        commit_sha,
        branch
      FROM deployments
      WHERE project_id=$1
      ORDER BY created_at DESC
      `,
      [req.params.projectId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});
router.get("/deployment/:deploymentId/timeline", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        event,
        message,
        created_at
      FROM deployment_events
      WHERE deployment_id=$1
      ORDER BY created_at ASC
      `,
      [req.params.deploymentId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});
// 1. 📁 FETCH ALL USER DEPLOYMENTS (Fallback parameterized route)
router.get('/deployments/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      `
            SELECT DISTINCT ON (d.project_id)
                d.*,
                COALESCE(p.name, d.repo_name) AS project_name
            FROM deployments d
            LEFT JOIN projects p
                ON d.project_id = p.id
            WHERE d.user_id = $1
            ORDER BY d.project_id, d.created_at DESC
            `,
      [userId]
    );

    result.rows.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

    res.json(result.rows);

  } catch (err) {
    console.error(
      "❌ [Dashboard Router Error]:",
      err.message
    );

    res.status(500).json({
      error: "Server failed to fetch deployment history"
    });
  }
});

// 2. 🚀 TRIGGER DEPLOYMENT WITH 2-APP FREE TIER CHECK
router.post('/deploy', async (req, res) => {
  const { deploymentId, projectId, userId, repoName, deploy_url } = req.body;

  try {
    const activeCheck = await db.query(
      "SELECT COUNT(*) FROM deployments WHERE user_id = $1 AND status = 'RUNNING'",
      [userId]
    );

    if (parseInt(activeCheck.rows[0].count) >= 2) {
      return res.status(403).json({
        error: "Free-tier limit reached! You can only have 2 live deployments active."
      });
    }
    const shortDeploymentId = deploymentId.split("-")[0];
    const newDeploy = await db.query(
      `INSERT INTO deployments (id, project_id, user_id, repo_name, status, deploy_url, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [deploymentId, projectId || null, userId, repoName || 'Unknown Repo', 'BUILDING', deploy_url || deploy_url || `http://${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}`]

    );

    res.json({ message: "Build initiated successfully", deployment: newDeploy.rows[0] });
  } catch (err) {
    console.error("❌ [Dashboard Router Error]:", err.message);
    res.status(500).json({ error: "Deployment orchestration failed" });
  }
});

// 3. 🗑️ DELETE APPLICATION BUTTON ROUTE
router.delete('/deployment/:deploymentId', async (req, res) => {
  const { deploymentId } = req.params;

  try {
    await db.query("BEGIN");

    const { rows } = await db.query(
      `
            SELECT project_id
            FROM deployments
            WHERE id = $1
            `,
      [deploymentId]
    );

    if (!rows.length) {
      await db.query("ROLLBACK");

      return res.status(404).json({
        error: "Deployment not found"
      });
    }

    const projectId = rows[0].project_id;

    await db.query(
      `
            DELETE FROM deployments
            WHERE id = $1
            `,
      [deploymentId]
    );
    await db.query(
      `
            UPDATE projects
            SET current_deployment_id = (
                SELECT id
                FROM deployments
                WHERE project_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            )
            WHERE id = $1
            AND current_deployment_id = $2
            `,
      [projectId, deploymentId]
    );

    await db.query("COMMIT");

    res.json({
      success: true,
      message: "Deployment deleted successfully."
    });

  } catch (err) {
    try {
      await db.query("ROLLBACK");
    } catch (_) { }

    console.error(
      "❌ [Dashboard Router Error]:",
      err.message
    );

    res.status(500).json({
      error: "Failed to delete the deployment"
    });
  }
});

// 4. ⚙️ PURGE ACCOUNT AND DATA
router.delete('/purge-account/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: "Account data permanently purged." });
  } catch (err) {
    console.error("❌ [Dashboard Router Error]:", err.message);
    res.status(500).json({ error: "Failed to completely close the account profile" });
  }
});

module.exports = router;