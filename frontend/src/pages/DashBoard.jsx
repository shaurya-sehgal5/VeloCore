import React from 'react';

function Dashboard({ githubUser, userId, repos, loadingRepos, onDeploy, onDisconnect }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>⚡ VeloCore Management Dashboard</h2>
          <p style={styles.subtitle}>Welcome back to your core orchestration environment.</p>
        </div>
        <div style={styles.badge}>
          🟢 Secure Session: @{githubUser}
        </div>
      </div>

      <div style={styles.body}>
        <h3 style={styles.sectionTitle}>📦 Select a Cloud Repository to Deploy</h3>
        
        {loadingRepos ? (
          <p style={styles.loadingText}>Querying GitHub cloud structures...</p>
        ) : (
          <div style={styles.repoList}>
            {repos.length === 0 ? (
              <p style={styles.emptyText}>No repositories identified on this token channel.</p>
            ) : (
              repos.map(repo => (
                <div key={repo.id} style={styles.repoCard}>
                  <div style={styles.repoMeta}>
                    <strong style={styles.repoName}>{repo.name}</strong>
                    <span style={styles.repoFullName}>{repo.full_name}</span>
                  </div>
                  <button 
                    onClick={() => onDeploy(repo.name, repo.clone_url)}
                    style={styles.deployBtn}
                  >
                    Deploy Engine
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button onClick={onDisconnect} style={styles.logoutBtn}>
          Disconnect Session
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { border: '1px solid #e2e8f0', borderRadius: '16px', padding: '30px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginTop: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '25px' },
  title: { margin: '0', color: '#0f172a', fontWeight: '700', letterSpacing: '-0.5px' },
  subtitle: { margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' },
  badge: { padding: '8px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', color: '#166534', fontSize: '14px', fontWeight: '600' },
  body: { marginBottom: '20px' },
  sectionTitle: { color: '#334155', fontSize: '18px', marginBottom: '15px', fontWeight: '600' },
  loadingText: { color: '#64748b', fontStyle: 'italic' },
  emptyText: { color: '#94a3b8' },
  repoList: { display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' },
  repoCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' },
  repoMeta: { textAlign: 'left' },
  repoName: { color: '#0f172a', display: 'block', fontSize: '15px' },
  repoFullName: { fontSize: '12px', color: '#64748b' },
  deployBtn: { padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  footer: { textAlign: 'right', marginTop: '25px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' },
  logoutBtn: { padding: '8px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
};

export default Dashboard;