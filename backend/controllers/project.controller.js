const db = require('../config/db'); 
const buildService = require('../services/build.service'); 
const { v4: uuidv4 } = require('uuid'); 
const axios = require('axios');
const path = require('path');

exports.getUserRepositories = async (req, res) => {
  try {
    const githubToken = req.user?.githubToken;
    if (!githubToken) {
      return res.status(401).json({ error: 'Unauthorized: Linked GitHub session token missing.' });
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params: { per_page: 10, sort: 'updated', direction: 'desc' }
    });
    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to synchronize repository configuration listings.' });
  }
};

exports.deployProject = async (req, res) => {
  try {
    const { repoName, cloneUrl, envVars, projectId } = req.body;
    const userId = req.user?.userId; 
    const githubToken = req.user?.githubToken;

    if (!repoName || !cloneUrl) {
      return res.status(400).json({ error: 'Bad Request: repoName and cloneUrl are required.' });
    }

    const deploymentId = uuidv4(); 
    const deploymentUrl = `http://localhost:9000/${deploymentId}`;
    
    // Compute the absolute filesystem path for the individual container workspace
    const workspaceDir = path.join(__dirname, '..', 'workspaces', deploymentId);

    console.log(`🆕 [Controller]: Creating unified deployment entry for ID: ${deploymentId}`);

    // Writing ALL columns explicitly to prevent NULL field data states
    await db.query(
      `INSERT INTO deployments (id, project_id, user_id, repo_name, status, url, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, 'INITIALIZING', $5, NOW(), NOW())`,
      [deploymentId, projectId || null, userId, repoName, deploymentUrl]
    );

    // Grab the global Socket.io 'io' instance attached to the Express app context
    // Grab the global Socket.io 'io' instance attached to the Express app context
    const io = req.app.get('io');

    // Respond to the frontend immediately so it can transition pages and join the socket room
    res.status(202).json({ 
      success: true, 
      message: "Deployment pipeline initialized.", 
      deploymentId,
      url: deploymentUrl
    });

    // Fire off cloning and background compilation loops asynchronously
    (async () => {
      // 💡 Give the frontend a 1.5-second window to mount and join the socket room channel safely
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (io) {
        io.to(deploymentId).emit('live_logs', '⏳ Connecting to deployment runtime agent...');
      }

      // 1. Download repository to storage workspace
      await buildService.cloneRepository(cloneUrl, githubToken, workspaceDir);
      
      // 2. Pass 'io' as the first parameter to stream live output chunks
      await buildService.compileProject(io, workspaceDir, deploymentId, envVars);
    })().catch(err => {
      console.error(`❌ [Background Pipeline Unhandled Exception]:`, err);
      if (io) {
        io.to(deploymentId).emit('live_logs', `❌ Critical Engine Error: ${err.message}`);
      }
    });

  } catch (error) {
    console.error("❌ [Deploy Controller Error]:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};