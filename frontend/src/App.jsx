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

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const authStatus = queryParams.get('auth');
    const username = queryParams.get('username');
    const id = queryParams.get('userId');

    if (authStatus === 'success' && username && id) {
      setGithubUser(username);
      setUserId(id);
      setCurrentView('dashboard');
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchGitHubRepositories(id);
    }
  }, []);

  const fetchGitHubRepositories = async (targetUserId) => {
    setLoadingRepos(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/github/repos/${targetUserId}`);
      if (!response.ok) throw new Error('Could not access repository endpoints.');
      const data = await response.json();
      setRepos(data);
    } catch (err) {
      setError('⚠️ Failed to load your GitHub repositories.');
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

  const handleDeployRepository = (repoName, cloneUrl) => {
    alert(`🚀 Core Trigger Initialized:\nPreparing build sequence for repository: ${repoName}\nTarget URL: ${cloneUrl}`);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginTop: '20px', fontSize: '14px', textAlign: 'center' }}>
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
            setGithubUser(null);
            setCurrentView('login');
          }}
        />
      )}
    </div>
  );
}

export default App;