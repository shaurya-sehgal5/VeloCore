const db = require('../config/db'); 
const buildService = require('../services/build.service'); 
const { v4: uuidv4 } = require('uuid'); 
const axios = require('axios');

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

    if (!repoName || !cloneUrl) {
      return res.status(400).json({ error: 'Bad Request: repoName and cloneUrl are required.' });
    }

    const deploymentId = uuidv4(); 
    const deploymentUrl = `http://localhost:9000/${deploymentId}`;
    console.log(`🆕 [Controller]: Creating unified deployment entry for ID: ${deploymentId}`);

    // 🔥 FIXED: Writing ALL columns explicitly to prevent NULL field data states
    await db.query(
      `INSERT INTO deployments (id, project_id, user_id, repo_name, status, url, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, 'INITIALIZING', $5, NOW(), NOW())`,
      [deploymentId, projectId || null, userId, repoName, deploymentUrl]
    );

    res.status(202).json({ 
      success: true, 
      message: "Deployment pipeline initialized.", 
      deploymentId,
      url: deploymentUrl
    });

    const workspaceDir = await buildService.cloneRepository(cloneUrl, req.user.githubToken, deploymentId);
    await buildService.compileProject(workspaceDir, deploymentId, envVars);

  } catch (error) {
    console.error("❌ [Deploy Controller Error]:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};