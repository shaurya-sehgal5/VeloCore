import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [error, setError] = useState(null);
  const [githubUser, setGithubUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // 🌟 NEW SECURITY VERIFICATION PATTERN: Check cookie status on page load
  useEffect(() => {
    const verifySecureSession = async () => {
      try {
        // MANDATORY FOR SECURE COOKIES: { credentials: 'include' } 
        // This forces the browser to attach the HttpOnly session cookie to the network call
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          style: 'cors',
          credentials: 'include' 
        });

        const data = await response.json();

        if (response.ok && data.authenticated) {
          setGithubUser(data.username);
          setUserId(data.userId);
          setCurrentView('dashboard');
          
          // Clear any authorization parameters from the URL bar cleanly
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Fetch the verified repositories list using the authenticated token channel
          fetchGitHubRepositories();
        }
      } catch (err) {
        console.log('🔄 No active secure session identified. Awaiting explicit user login.');
      }
    };

    verifySecureSession();
  }, []);

  const fetchGitHubRepositories = async () => {
    setLoadingRepos(true);
    try {
      // Notice we no longer pass the userId parameter in the URL path. 
      // The backend reads it directly out of the secure cookie!
      const response = await fetch(`${API_BASE_URL}/api/auth/github/repos/me`, {
        credentials: 'include' // Enforces cookie passage
      });
      
      if (!response.ok) throw new Error('Could not access repository endpoints.');
      const data = await response.json();
      setRepos(data);
    } catch (err) {
      setError('⚠️ Failed to securely sync your GitHub repositories.');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      setError("❌ Configuration Mapping Defect: VITE_GITHUB_CLIENT_ID is unmapped.");
      return;
    }
    const redirectUri = "http://localhost:5000/api/auth/github/callback";
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;
  };

 const handleDeployRepository = async (repoName, cloneUrl) => {
  setError(null);

  try {

    const response = await fetch(`${API_BASE_URL}/api/project/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        repoName,
        cloneUrl
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to initialize build.');
    }

    console.log("🚀 Deployment Response:", data);

    // IMPORTANT
    return data;

  } catch (err) {

    setError(`❌ Deployment Failed: ${err.message}`);

    return null;

  }
};
  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            maxWidth: '90%',
            width: 'max-content',
            padding: '12px 20px',
            backgroundColor: 'rgba(254, 226, 226, 0.97)',
            color: '#dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {error}
        </div>
      )}

      {currentView === 'login' ? (
        <Login onGitHubLogin={handleGitHubLogin} />
      ) : (
        <Dashboard 
          githubUser={githubUser}
          userId={userId}
          repos={repos}
          loadingRepos={loadingRepos}
          onDeploy={handleDeployRepository}
          onDisconnect={() => {
            // Future step: hit a backend endpoint to clear the cookie, for now reset local layout view state
            setGithubUser(null);
            setCurrentView('login');
          }}
        />
      )}
    </div>
  );
}

export default App;