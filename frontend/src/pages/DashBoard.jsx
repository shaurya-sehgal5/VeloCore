import React, { useState, useEffect } from 'react';

function Dashboard({ githubUser, repos, loadingRepos, onDeploy, onDisconnect }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      const tablet = window.innerWidth <= 1024;
      setIsTablet(tablet);
      setSidebarOpen(!tablet);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={s.page}>
      {isTablet && sidebarOpen && (
        <div style={s.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      <div style={{
        ...s.sidebar,
        ...(isTablet ? s.sidebarMobile : {}),
        transform: isTablet && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <span style={s.logoText}>VeloCore</span>
        </div>

        <nav style={s.nav}>
          {[
            { label: 'Projects', icon: 'M3 3h18v18H3zM3 9h18M9 21V9' },
            { label: 'Deployments', icon: 'M5 12h14M12 5l7 7-7 7' },
            { label: 'Metrics', icon: 'M3 3v18h18M7 14l3-3 3 3 5-6' },
            { label: 'Settings', icon: 'M12 1v6m0 10v6m11-11h-6M7 12H1' },
          ].map((item, i) => (
            <div key={i} style={{ ...s.navItem, ...(i === 0 ? s.navActive : {}) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d={item.icon}/>
              </svg>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={s.clusterBox}>
          <div style={s.clusterRow}><span style={s.clusterDot} />API: <b style={s.clusterVal}>operational</b></div>
          <div style={s.clusterRow}><span style={s.clusterDot} />Builds: <b style={s.clusterVal}>2 active</b></div>
        </div>

        <div style={s.userRow}>
          <div style={s.avatar}>{githubUser?.[0]?.toUpperCase()}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={s.userName}>@{githubUser}</div>
            <div style={s.userSub}>GitHub · Connected</div>
          </div>
          <button onClick={onDisconnect} style={s.disconnectBtn} title="Disconnect">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ ...s.main, marginLeft: isTablet ? 0 : 0 }}>
        <div style={s.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {isTablet && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={s.menuBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#888" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <div>
              <div style={s.pageTitle}>Projects</div>
              <div style={s.pageSub}>Select a repository to deploy</div>
            </div>
          </div>
          <div style={s.statusPill}>
            <div style={s.statusDot} />
            <span style={s.hideOnSmall}>engine online</span>
          </div>
        </div>

        <div style={s.statsRow}>
          {[
            { label: 'Repositories', value: repos.length || '—' },
            { label: 'Active builds', value: '2' },
            { label: 'Avg deploy time', value: '38s' },
          ].map((stat, i) => (
            <div key={i} style={s.statCard}>
              <div style={s.statLabel}>{stat.label}</div>
              <div style={s.statValue}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={s.repoArea}>
          {loadingRepos ? (
            <div style={s.emptyState}>
              <span style={s.cursorBlink}>▊</span>
              <div style={s.emptyText}>querying github cloud structures...</div>
            </div>
          ) : repos.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyText}>no repositories found on this token channel.</div>
            </div>
          ) : (
            <div style={s.repoList}>
              {repos.map(repo => (
                <div key={repo.id} style={s.repoCard}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2d2d2d'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}
                >
                  <div style={s.repoLeft}>
                    <div style={s.repoIcon}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#525252" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={s.repoName}>{repo.name}</div>
                      <div style={s.repoFull}>{repo.full_name}</div>
                    </div>
                  </div>
                  <button onClick={() => onDeploy(repo.name, repo.clone_url)} style={s.deployBtn}
                    onMouseEnter={e => e.target.style.background = '#1a1a1a'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    Deploy <span style={s.hideOnSmall}>→</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#0a0a0a', color: '#e4e4e4', fontFamily: 'Inter, sans-serif', position: 'relative' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9 },
  sidebar: {
    width: 220, background: '#0d0d0d', borderRight: '1px solid #141414',
    display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0,
    transition: 'transform 0.2s ease',
  },
  sidebarMobile: {
    position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 10,
    width: 240, boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '0 20px', marginBottom: 28 },
  logoIcon: {
    width: 28, height: 28, background: '#e4e4e4', borderRadius: 5,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontFamily: 'monospace', fontSize: 14, fontWeight: 500, color: '#e4e4e4' },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', marginBottom: 16 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 6,
    fontSize: 13.5, color: '#525252', cursor: 'pointer', transition: 'color 0.1s',
  },
  navActive: { color: '#e4e4e4', background: '#151515' },
  clusterBox: {
    margin: '0 20px', padding: '10px 12px', background: '#0f0f0f',
    border: '1px solid #161616', borderRadius: 6, fontFamily: 'monospace',
    fontSize: 10.5, color: '#525252', display: 'flex', flexDirection: 'column', gap: 6,
  },
  clusterRow: { display: 'flex', alignItems: 'center', gap: 6 },
  clusterDot: { width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' },
  clusterVal: { color: '#888', marginLeft: 2 },
  userRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 0',
    borderTop: '1px solid #141414', marginTop: 'auto',
  },
  avatar: {
    width: 28, height: 28, background: '#1f1f1f', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, color: '#888', flexShrink: 0,
  },
  userName: { fontSize: 12.5, fontWeight: 500, color: '#d4d4d4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userSub: { fontSize: 11, color: '#3f3f3f', fontFamily: 'monospace' },
  disconnectBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#3f3f3f', cursor: 'pointer', padding: 4, display: 'flex' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', borderBottom: '1px solid #141414', flexWrap: 'wrap', gap: 12,
  },
  menuBtn: { background: 'none', border: '1px solid #1f1f1f', borderRadius: 6, padding: 7, cursor: 'pointer', display: 'flex' },
  pageTitle: { fontSize: 16, fontWeight: 600, color: '#f0f0f0', letterSpacing: '-0.3px' },
  pageSub: { fontSize: 12, color: '#525252', marginTop: 2 },
  statusPill: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#525252', fontFamily: 'monospace' },
  statusDot: { width: 6, height: 6, borderRadius: '50%', background: '#4ade80' },
  hideOnSmall: {},
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
    background: '#141414', margin: '0 24px', marginTop: 20, borderRadius: 8, overflow: 'hidden',
  },
  statCard: { background: '#0d0d0d', padding: '14px 18px' },
  statLabel: { fontSize: 11, color: '#3f3f3f', fontFamily: 'monospace', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: 700, color: '#e4e4e4', letterSpacing: '-0.5px' },
  repoArea: { flex: 1, padding: '20px 24px', overflowY: 'auto' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 },
  emptyText: { fontSize: 12.5, color: '#3f3f3f', fontFamily: 'monospace' },
  cursorBlink: { color: '#4ade80', fontFamily: 'monospace', animation: 'blink 1s step-end infinite' },
  repoList: { display: 'flex', flexDirection: 'column', gap: 6 },
  repoCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', background: '#0d0d0d', border: '1px solid #1a1a1a',
    borderRadius: 8, transition: 'border-color 0.15s', gap: 12,
  },
  repoLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  repoIcon: {
    width: 32, height: 32, background: '#111', border: '1px solid #1f1f1f',
    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  repoName: { fontSize: 13.5, fontWeight: 500, color: '#d4d4d4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  repoFull: { fontSize: 11.5, color: '#3f3f3f', fontFamily: 'monospace', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  deployBtn: {
    padding: '7px 14px', background: 'transparent', color: '#888',
    border: '1px solid #1f1f1f', borderRadius: 6, fontSize: 12.5,
    cursor: 'pointer', fontWeight: 500, transition: 'background 0.1s', fontFamily: 'inherit', flexShrink: 0,
  },
};

export default Dashboard;