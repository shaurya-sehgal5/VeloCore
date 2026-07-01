import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const TABS = [
  {
    key: 'projects',
    label: 'Projects',
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: 'deployments',
    label: 'Deployments',
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function Dashboard({ githubUser, repos, onDeploy, loadingRepos, onDisconnect }) {
  const [activeDeploymentId, setActiveDeploymentId] = useState(null);
  const [buildLogs, setBuildLogs] = useState([]);
  const [buildStatus, setBuildStatus] = useState('Idle');
  const [activeTab, setActiveTab] = useState('projects');

  const terminalEndRef = useRef(null);

  // Auto-scroll logic
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buildLogs]);

  // 📡 WEBSOCKET LIFECYCLE MANAGEMENT
  useEffect(() => {
    if (!activeDeploymentId) return;

    console.log(`📡 [Socket Init]: Connecting to backend for Room: ${activeDeploymentId}`);

    // Force connection to your backend port
    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ [Socket Connected]: Requesting to join room:', activeDeploymentId);
      // Join the unique deployment room channel
      socket.emit('join-deployment-stream', activeDeploymentId);
    });

    // 🔥 THE REAL-TIME LOG CATCHER
    socket.on('build-log-stream', (payload) => {
      console.log('📥 [Socket Log Received]:', payload);

      // Extract text safely whether it's an object or a raw string
      const incomingText = typeof payload === 'object' && payload !== null ? payload.text : payload;

      if (incomingText) {
        setBuildLogs((prev) => [...prev, incomingText]);
      }
    });

    socket.on('build-status-update', (data) => {
      console.log('📊 [Socket Status Update]:', data.status);
      setBuildStatus(data.status);
      if (data.status === 'Success' || data.status === 'Failed') {
        socket.disconnect();
      }
    });

    return () => {
      console.log('🔌 [Socket Cleanup]: Disconnecting socket channel.');
      socket.disconnect();
    };
  }, [activeDeploymentId]);

  const handleTriggerBuild = async (repoName, cloneUrl) => {
    console.log(`🚀 [Build Triggered] for: ${repoName}`);
    setBuildLogs([]);
    setBuildStatus('Initializing...');
    setActiveTab('deployments');

    try {
      const responseData = await onDeploy(repoName, cloneUrl);
      console.log('📥 [API Response Data]:', responseData);

      if (responseData && responseData.deploymentId) {
        // This triggers the useEffect hook above to connect the socket
        setActiveDeploymentId(responseData.deploymentId);
        setBuildStatus('Building...');
      } else {
        setBuildStatus('Failed');
        setBuildLogs(['❌ Error: Backend API did not return a valid deploymentId.']);
      }
    } catch (err) {
      setBuildStatus('Failed');
      setBuildLogs([`❌ Network Error: ${err.message}`]);
    }
  };

  const isBusy = buildStatus === 'Building...' || buildStatus === 'Initializing...';

  const statusColors = {
    Success: { fg: '#3ecf8e', bg: 'rgba(62, 207, 142, 0.12)', border: 'rgba(62, 207, 142, 0.4)' },
    Failed: { fg: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.4)' },
    'Building...': { fg: '#facc15', bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.35)' },
    'Initializing...': { fg: '#facc15', bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.35)' },
    Idle: { fg: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)', border: 'rgba(107, 114, 128, 0.3)' },
  };
  const statusStyle = statusColors[buildStatus] || statusColors.Idle;

  return (
    <div
      style={{
        minHeight: '100svh',
        width: '100%',
        backgroundColor: '#08090a',
        backgroundImage:
          'radial-gradient(circle at 15% 0%, rgba(62,207,142,0.06) 0%, transparent 45%), radial-gradient(circle at 85% 100%, rgba(62,207,142,0.04) 0%, transparent 40%)',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#e4e4e7',
        padding: '32px clamp(16px, 4vw, 48px)',
        boxSizing: 'border-box',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.08em',
              color: '#3ecf8e',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            velocore // dashboard
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#fafafa' }}>
            Welcome, <span style={{ color: '#3ecf8e' }}>{githubUser || 'Developer'}</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#71717a', fontSize: '13.5px' }}>
            Manage and deploy your projects in real-time.
          </p>
        </div>

        <button
          onClick={onDisconnect}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            color: '#a1a1aa',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '9px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)';
            e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a1a1aa';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
          }}
        >
          <span style={{ fontSize: '14px' }}>⏻</span> logout
        </button>
      </header>

      {/* TAB BAR */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          padding: '5px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          width: 'fit-content',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const showBusyDot = tab.key === 'deployments' && isBusy;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12.5px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: isActive ? '#08090a' : '#a1a1aa',
                background: isActive ? '#3ecf8e' : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.icon(isActive ? '#08090a' : '#71717a')}
              {tab.label}
              {showBusyDot && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isActive ? '#08090a' : '#facc15',
                    animation: 'dashPulse 1.2s ease-in-out infinite',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ---------- PROJECTS TAB ---------- */}
      {activeTab === 'projects' && (
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(12px)',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            minWidth: 0,
          }}
        >
          <h3
            style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#a1a1aa',
              fontWeight: 500,
            }}
          >
            Repositories <span style={{ color: '#3ecf8e' }}>({repos?.length || 0})</span>
          </h3>

          {loadingRepos ? (
            <p style={{ color: '#52525b', fontSize: '13.5px', fontFamily: "'JetBrains Mono', monospace" }}>
              $ fetching repositories from github...
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {repos?.map((repo) => (
                <div
                  key={repo.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    minWidth: 0,
                  }}
                >
                  <div style={{ overflow: 'hidden', marginRight: '12px', minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontWeight: 600,
                        color: '#fafafa',
                        fontSize: '14px',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {repo.name}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#52525b',
                        fontFamily: "'JetBrains Mono', monospace",
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {repo.clone_url}
                    </span>
                  </div>
                  <button
                    onClick={() => handleTriggerBuild(repo.name, repo.clone_url)}
                    disabled={isBusy}
                    style={{
                      backgroundColor: isBusy ? 'rgba(62,207,142,0.15)' : '#3ecf8e',
                      color: isBusy ? '#3ecf8e' : '#08090a',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '7px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    Deploy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- DEPLOYMENTS TAB ---------- */}
      {activeTab === 'deployments' && (
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(12px)',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '13px',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#a1a1aa',
                fontWeight: 500,
              }}
            >
              Build Logs
            </h3>
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                backgroundColor: statusStyle.bg,
                color: statusStyle.fg,
                border: `1px solid ${statusStyle.border}`,
                padding: '4px 10px',
                borderRadius: '9999px',
              }}
            >
              {buildStatus}
            </span>
          </div>

          {/* THE DARK TERMINAL CONTAINER */}
          <div
            style={{
              backgroundColor: '#050505',
              color: '#3ecf8e',
              padding: '16px',
              borderRadius: '10px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12.5px',
              lineHeight: '1.7',
              height: '440px',
              overflowY: 'auto',
              border: '1px solid rgba(62,207,142,0.1)',
              boxShadow: 'inset 0 2px 8px 0 rgba(0,0,0,0.6)',
            }}
          >
            {buildLogs.length === 0 ? (
              <div style={{ color: '#3f3f46', fontStyle: 'italic' }}>
                {activeDeploymentId ? '$ starting container process...' : '$ waiting for deployment trigger...'}
                <span style={{ animation: 'blink 1s step-start infinite' }}>▍</span>
              </div>
            ) : (
              buildLogs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: log.toLowerCase().includes('error') || log.includes('❌') ? '#f87171' : '#d4d4d8',
                  }}
                >
                  <span style={{ color: '#3ecf8e', marginRight: '10px', userSelect: 'none', opacity: 0.6 }}>
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* ---------- SETTINGS TAB ---------- */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }} className="vc-grid">
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(12px)',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '13px',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#a1a1aa',
                fontWeight: 500,
              }}
            >
              Account
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: '50%', background: 'rgba(62,207,142,0.12)',
                    border: '1px solid rgba(62,207,142,0.3)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#3ecf8e', fontWeight: 700, fontSize: '14px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {(githubUser || 'D').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fafafa' }}>{githubUser || 'Developer'}</div>
                  <div style={{ fontSize: '12px', color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>
                    connected via github
                  </div>
                </div>
              </div>
              <button
                onClick={onDisconnect}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12.5px',
                  color: '#f87171',
                  backgroundColor: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  padding: '8px 14px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Disconnect
              </button>
            </div>
            <p style={{ fontSize: '12.5px', color: '#52525b', lineHeight: 1.6, margin: 0 }}>
              Disconnecting revokes VeloCore's read-only access to your GitHub repositories and signs you out of this session.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(12px)',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '13px',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#a1a1aa',
                fontWeight: 500,
              }}
            >
              About
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#a1a1aa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#52525b' }}>Platform</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e4e4e7' }}>VeloCore</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#52525b' }}>Active repositories</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e4e4e7' }}>{repos?.length || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#52525b' }}>Last build status</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: statusStyle.fg }}>{buildStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes dashPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        @media (max-width: 900px) {
          .vc-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;