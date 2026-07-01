const axios = require('axios');
const { buildQueue } = require('../queues/build.queue'); 

/**
 * 📁 FETCH LIVE REPOSITORIES FROM GITHUB API
 * Synchronizes with the user's active GitHub account context profiles
 */
exports.getUserRepositories = async (req, res) => {
  try {
    console.log(`📡 [Control Plane]: Fetching live repository listings from GitHub API for User ID: ${req.user?.id || 'Unknown'}`);
    
    // Retrieve the secure GitHub access token from your verified auth session context middleware
    const githubToken = req.user?.githubToken;

    if (!githubToken) {
      return res.status(401).json({ error: 'Unauthorized: Linked GitHub session token context missing.' });
    }

    // Reach out directly to the upstream GitHub api engine endpoint
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params: {
        per_page: 10,       // Matches your target component mapping limit configurations
        sort: 'updated',
        direction: 'desc'
      }
    });

    return res.status(200).json(response.data);

  } catch (err) {
    console.error('❌ [Control Plane GitHub Sync Exception]:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to synchronize repository mapping configurations from GitHub.' });
  }
};

/**
 * 🚀 TRIGGER PROJECT DEPLOYMENT PIPELINE
 * Accepts repository target payloads, provisions tracking IDs, and enqueues jobs into Redis.
 */
exports.deployProject = async (req, res) => {
  console.log('📥 [Control Plane Incoming Payload]:', req.body);

  const { repoName, cloneUrl } = req.body;

  if (!repoName || !cloneUrl) {
    console.error('❌ [Validation Failure]: Missing critical body parameters.');
    return res.status(400).json({ error: 'Bad Request: repoName and cloneUrl are required.' });
  }

  try {
    // Generate a clean tracking deployment ID timestamp string
    const deploymentId = `deploy-${Date.now()}`;
    const githubToken = req.user?.githubToken || ''; 

    console.log(`🎟️ [Control Plane]: Enqueuing job ticket for ${deploymentId} into Redis...`);

    // Push task ticket straight onto the BullMQ Redis conveyor belt infrastructure
    await buildQueue.add(`job-${deploymentId}`, {
      deploymentId,
      repoName,
      cloneUrl,
      githubToken
    });

    // Return the required JSON object token structure so your frontend Dashboard.jsx handles the redirect smoothly
    return res.status(202).json({
      success: true,
      message: '🚀 Deployment ticket safely received and queued.',
      deploymentId: deploymentId, 
      status: 'Queued'
    });

  } catch (err) {
    console.error('❌ [Control Plane Queue Exception]:', err.message);
    return res.status(500).json({ error: 'Internal deployment pipeline allocation failure.' });
  }
};