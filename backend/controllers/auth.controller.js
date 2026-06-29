const db = require('../cofig/db');

exports.gitHubCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authentication Mismatch: Missing authorization code parameter.');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('Upstream provider validation handshake rejected.');
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` },
    });
    const userData = await userResponse.json();
    
    const username = userData.login;
    const email = userData.email || `${username}@github.local`;

    const dbResult = await db.query(
      `INSERT INTO users (name, email, github_username, github_token) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) 
       DO UPDATE SET github_token = $4, github_username = $3
       RETURNING id;`,
      [userData.name || username, email, username, accessToken]
    );

    const userId = dbResult.rows[0].id;
    return res.redirect(`http://localhost:5173/?auth=success&username=${username}&userId=${userId}`);

  } catch (err) {
    console.error('❌ Controller Core Integration Drop:', err.message);
    return res.redirect('http://localhost:5173/?auth=failed');
  }
};

exports.getGitHubRepositories = async (req, res) => {
  const { userId } = req.params;

  try {
    const userQuery = await db.query('SELECT github_token FROM users WHERE id = $1', [userId]);
    
    if (userQuery.rows.length === 0 || !userQuery.rows[0].github_token) {
      return res.status(404).json({ error: 'OAuth Session identity state context missing.' });
    }

    const token = userQuery.rows[0].github_token;

    const repoResponse = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'VeloCore-Engine-Node'
      }
    });

    if (!repoResponse.ok) {
      throw new Error(`Upstream provider error status: ${repoResponse.status}`);
    }

    const repos = await repoResponse.json();
    const mappedOutput = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      clone_url: repo.clone_url,
      description: repo.description
    }));

    return res.json(mappedOutput);

  } catch (err) {
    console.error('❌ Controller Repository Execution Error:', err.message);
    return res.status(500).json({ error: 'Failed to balance downstream repository state context arrays.' });
  }
};