const buildService = require('../services/build.service');
const db = require('../config/db');
const { decrypt } = require('../utils/crypto'); // <-- Add this import

exports.triggerDeployment = async (req, res) => {
  const { repoName, cloneUrl } = req.body;
const userId = req.user.userId;

  if (!cloneUrl || !userId) {
    return res.status(400).json({ error: 'Missing clone_url or target userId parameters.' });
  }

  const deploymentId = `deploy-${Date.now()}`;

  try {
    const userQuery = await db.query('SELECT github_token FROM users WHERE id = $1', [userId]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User profile node not found.' });
    }
    
    // SECURE FIX: Decrypt the token out of the DB column state before running the clone
    const encryptedToken = userQuery.rows[0].github_token;
    const plainTextToken = decrypt(encryptedToken);

    // Run the secured spawn clone
    const projectPath = await buildService.cloneRepository(cloneUrl, plainTextToken, deploymentId);

    return res.status(200).json({
      message: '🚀 Build workspace successfully initialized.',
      deploymentId,
      localWorkspacePath: projectPath
    });

  } catch (err) {
    console.error('❌ Project Controller Failure Trigger:', err.message);
    return res.status(500).json({ error: err.message });
  }
};