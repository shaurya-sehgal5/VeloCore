import React from 'react';

function Login({ onGitHubLogin }) {
  return (
    <div style={styles.card}>
      <h1 style={styles.title}>🚀 VeloPlatform</h1>
      <p style={styles.subtitle}>The Automated Target Cloud Infrastructure & Deployment Engine</p>
      
      <div style={styles.btnContainer}>
        <button onClick={onGitHubLogin} style={styles.githubBtn}>
          🐈 Connect via GitHub OAuth
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: { textAlign: 'center', padding: '60px 40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', backgroundColor: '#ffffff', marginTop: '40px' },
  title: { margin: '0 0 10px 0', color: '#0f172a', fontSize: '32px', fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: '16px', margin: '0 0 35px 0' },
  btnContainer: { maxWidth: '400px', margin: '0 auto' },
  githubBtn: { padding: '14px 24px', backgroundColor: '#24292e', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', width: '100%', fontSize: '16px', letterSpacing: '-0.5px' }
};

export default Login;