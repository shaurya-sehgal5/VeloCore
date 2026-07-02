const express = require('express');
const router = express.Router();
const pool = require('../config/db'); 

// FETCH 12-HOUR HISTORICAL LOGS FOR THE DEVOPS CHARTS
router.get('/history/:deploymentId', async (req, res) => {
  const { deploymentId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM app_metrics 
       WHERE deployment_id = $1 
       AND timestamp >= NOW() - INTERVAL '12 hours' 
       ORDER BY timestamp ASC`,
      [deploymentId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Could not fetch time-series metrics" });
  }
});

module.exports = router;