const db = require('../config/db');
const { encrypt } = require('../utils/crypto');
const jwt = require('jsonwebtoken');
const config = require("../config/env")

exports.gitHubCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Authorization signature validation missing.');

  try {

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: config.GITHUB_CLIENT_ID,
        client_secret: config.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) throw new Error('Upstream code mapping verification failed.');

    // 2. Extract Authenticated Entity Identity
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` },
    });
    const userData = await userResponse.json();

    const username = userData.login;
    const email = userData.email || `${username}@github.local`;
    const secureTokenCiphertext = encrypt(accessToken);


    const dbResult = await db.query(
      `INSERT INTO users (name, email, github_username, github_token) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) 
       DO UPDATE SET github_token = $4, github_username = $3
       RETURNING id;`,
      [userData.name || username, email, username, secureTokenCiphertext]
    );

    const userId = dbResult.rows[0].id;

   
    const sessionToken = jwt.sign(
      { userId: userId, username: username },
      config.JWT_SECRET,
      { expiresIn: '7d' } // Session valid for 7 days
    );

  
    res.cookie('veloplatform_session', sessionToken, {
      httpOnly: true,     
      secure: false,     
      sameSite: 'lax',   
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    // Clean, secure redirect with zero tracking variables exposed in the URL bar
    return res.redirect(`${config.FRONTEND_URL}/?auth=success`);

  } catch (err) {
    console.error('❌ Controller Core Integration Drop:', err.message);
    return res.redirect(`${config.FRONTEND_URL}/?auth=failed`);
  }
};


exports.getAuthenticatedUser = async (req, res) => {
  // If the request passes the middleware, the user data is attached directly to the request object
  return res.status(200).json({
    authenticated: true,
    userId: req.user.userId,
    username: req.user.username
  });
};

exports.getGitHubRepositories = async (req, res) => {
  // Pull the cryptographically verified user ID from our authentication middleware layer
  const userId = req.user.userId;

  try {
    // 1. Query our database to find the user's encrypted GitHub token
    const userQuery = await db.query('SELECT github_token FROM users WHERE id = $1', [userId]);

    if (userQuery.rows.length === 0 || !userQuery.rows[0].github_token) {
      return res.status(404).json({ error: 'OAuth Session context state missing or invalid.' });
    }

    // 2. Decrypt the GitHub token using our secure AES-256-GCM utility module
    const { decrypt } = require('../utils/crypto');
    const secureEncryptedToken = userQuery.rows[0].github_token;
    const plainTextGitHubToken = decrypt(secureEncryptedToken);

    console.log(`📡 [Control Plane]: Fetching live repository listings from GitHub API for User ID: ${userId}`);

    // 3. Request the repository listing directly from the official upstream GitHub API
    const repoResponse = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: {
        'Authorization': `Bearer ${plainTextGitHubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'VeloCore-Engine-Node' // GitHub requires a User-Agent string to prevent automated script blocks
      }
    });

    if (!repoResponse.ok) {
      throw new Error(`Upstream provider error status: ${repoResponse.status}`);
    }

    const repos = await repoResponse.json();

    // 4. Filter out only the necessary parameters to keep data transmission lightweight
    const mappedOutput = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      clone_url: repo.clone_url,
      description: repo.description
    }));

    // Return the clean, mapped array structure back to our React application dashboard
    return res.json(mappedOutput);

  } catch (err) {
    console.error('❌ Controller Repository Execution Error:', err.message);
    return res.status(500).json({ error: 'Failed to securely sync your GitHub repositories.' });
  }
};
exports.logout = (req, res) => {

  res.clearCookie("veloplatform_session", {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  });

  return res.status(200).json({
    message: "Logged out successfully"
  });

};