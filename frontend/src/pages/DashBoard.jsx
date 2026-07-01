import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

function Dashboard({ githubUser, repos, onDeploy, loadingRepos }) {
  const [activeDeploymentId, setActiveDeploymentId] = useState(null);
  const [buildLogs, setBuildLogs] = useState([]);
  const [buildStatus, setBuildStatus] = useState('Idle');
  
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

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>Welcome, {githubUser || 'Developer'} 👋</h2>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Manage and deploy your projects in real-time.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: REPOSITORIES */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#374151' }}>Your Repositories ({repos?.length || 0})</h3>
          
          {loadingRepos ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading repos from GitHub...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {repos?.map((repo) => (
                <div key={repo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                  <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                    <span style={{ display: 'block', fontWeight: '600', color: '#111827', textOverflow: 'ellipsis', overflow: 'hidden' }}>{repo.name}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#6b7280', textOverflow: 'ellipsis', overflow: 'hidden' }}>{repo.clone_url}</span>
                  </div>
                  <button 
                    onClick={() => handleTriggerBuild(repo.name, repo.clone_url)}
                    disabled={buildStatus === 'Building' || buildStatus === 'Initializing...'}
                    style={{ backgroundColor: '#111827', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Deploy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TERMINAL LOGS */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#374151' }}>Real-time Build Logs</h3>
            <span style={{ fontSize: '12px', fontWeight: '600', backgroundColor: buildStatus === 'Success' ? '#d1fae5' : buildStatus === 'Failed' ? '#fee2e2' : '#eef2f6', color: buildStatus === 'Success' ? '#065f46' : buildStatus === 'Failed' ? '#991b1b' : '#1f2937', padding: '4px 10px', borderRadius: '9999px' }}>
              {buildStatus}
            </span>
          </div>

          {/* THE DARK TERMINAL CONTAINER */}
          <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', height: '400px', overflowY: 'auto', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.6)' }}>
            {buildLogs.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                {activeDeploymentId ? 'Starting container process...' : 'Waiting for deployment triggers...'}
              </div>
            ) : (
              buildLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '4px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: log.toLowerCase().includes('error') || log.includes('❌') ? '#f87171' : '#f8fafc' }}>
                  <span style={{ color: '#475569', marginRight: '8px', userSelect: 'none' }}>{(index + 1).toString().padStart(2, '0')}</span>
                  {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;