const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const secureShield = require('../middleware/auth.middleware'); 

// 🔥 NEW: Dynamic authenticated analytics list lookup (No hardcoded IDs needed)
router.get('/analytics-list', secureShield, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      `SELECT d.*, COALESCE(p.name, d.repo_name) as project_name
       FROM deployments d
       LEFT JOIN projects p ON d.project_id = p.id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

  
  

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 1. 📁 FETCH ALL USER DEPLOYMENTS (Fallback parameterized route)
router.get('/deployments/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query(
      `SELECT d.*, COALESCE(p.name, d.repo_name) as project_name 
       FROM deployments d 
       LEFT JOIN projects p ON d.project_id = p.id 
       WHERE d.user_id = $1 
       ORDER BY d.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ [Dashboard Router Error]:", err.message);
    res.status(500).json({ error: "Server failed to fetch deployment history" });
  }
});

// 2. 🚀 TRIGGER DEPLOYMENT WITH 2-APP FREE TIER CHECK
router.post('/deploy', async (req, res) => {
  const { deploymentId, projectId, userId, repoName, url } = req.body;
  
  try {
    const activeCheck = await db.query(
      "SELECT COUNT(*) FROM deployments WHERE user_id = $1 AND status = 'READY'",
      [userId]
    );
    
    if (parseInt(activeCheck.rows[0].count) >= 2) {
      return res.status(403).json({ 
        error: "Free-tier limit reached! You can only have 2 live deployments active." 
      });
    }

    const newDeploy = await db.query(
      `INSERT INTO deployments (id, project_id, user_id, repo_name, status, url, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [deploymentId, projectId || null, userId, repoName || 'Unknown Repo', 'BUILDING', url || `http://localhost:8000/visit/${deploymentId}`]
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
    await db.query('DELETE FROM deployments WHERE id = $1', [deploymentId]);
    res.json({ success: true, message: "Application deleted from dashboard records." });
  } catch (err) {
    console.error("❌ [Dashboard Router Error]:", err.message);
    res.status(500).json({ error: "Failed to delete the application" });
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