import React, { useEffect, useRef } from 'react';

function TerminalLogs({ logs, status }) {
  const terminalEndRef = useRef(null);

  // Automatically scroll the terminal view down as new log packages stream in
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getStatusColor = () => {
    switch (status) {
      case 'Success': return '#22c55e'; // Green
      case 'Failed': return '#ef4444'; // Red
      case 'Compiling': return '#3b82f6'; // Blue
      default: return '#9ca3af'; // Gray
    }
  };    

  return (
    <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', padding: '20px', fontFamily: 'monospace', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', marginTop: '24px' }}>
      {/* Terminal Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '12px' }}>velocore-compiler-sandbox ~ logs</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(), animation: status === 'Compiling' || status === 'Cloning' ? 'pulse 1.5s infinite' : 'none' }} />
          <span style={{ fontSize: '12px', color: getStatusColor(), fontWeight: 'bold' }}>{status || 'Queued'}</span>
        </div>
      </div>

      {/* Real-time Streaming Logs Feed Output Window */}
      <div style={{ height: '320px', overflowY: 'auto', fontSize: '13px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
        {logs.length === 0 ? (
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>🔄 Waiting for build worker engine to claim queue allocation ticket...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ color: log.type === 'err' ? '#f87171' : '#f1f5f9', wordBreak: 'break-all' }}>
              <span style={{ color: '#64748b', marginRight: '8px', userSelect: 'none' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              {log.text}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Custom Keyframe Styles for the Pulse Loading Indicator */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default TerminalLogs;