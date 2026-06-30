const db = require('../config/db');
const { encrypt } = require('../utils/crypto');
const jwt = require('jsonwebtoken');

exports.gitHubCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Authorization signature validation missing.');

  try {
    // 1. Handshake with GitHub Core Engine for Access Token Channel
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
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

    // 3. Persist State Context Grid into PostgreSQL
    const dbResult = await db.query(
      `INSERT INTO users (name, email, github_username, github_token) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) 
       DO UPDATE SET github_token = $4, github_username = $3
       RETURNING id;`,
      [userData.name || username, email, username, secureTokenCiphertext]
    );

    const userId = dbResult.rows[0].id;

    // 🌟 SECURE PRODUCTION IMPLEMENTATION: Generate a signed JSON Web Token (JWT)
    const sessionToken = jwt.sign(
      { userId: userId, username: username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' } // Session valid for 7 days
    );

    // 🌟 SECURE PRODUCTION IMPLEMENTATION: Inject Token inside an httpOnly Cookie
    res.cookie('veloplatform_session', sessionToken, {
      httpOnly: true,     // Protects against Cross-Site Scripting (XSS) attacks by making it inaccessible to browser JS scripts
      secure: false,      // Set to TRUE in production when utilizing real HTTPS SSL contexts
      sameSite: 'lax',    // Defends against Cross-Site Request Forgery (CSRF)
      maxAge: 7 * 24 * 60 * 60 * 1000 // Match expiration window with token signature (7 days)
    });

    // Clean, secure redirect with zero tracking variables exposed in the URL bar
    return res.redirect(`http://localhost:5173/?auth=success`);

  } catch (err) {
    console.error('❌ Controller Core Integration Drop:', err.message);
    return res.redirect('http://localhost:5173/?auth=failed');
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

/**
 * SECURE PRODUCTION METHOD: Fetches repositories for the logged-in user
 * Pulls identity context entirely from the secure HTTP-Only cookie wrapper
 */
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