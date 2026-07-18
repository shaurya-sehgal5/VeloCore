import React, { useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import { MONO } from '../config';

export default function LogsTab({ status, logs, active }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontFamily: MONO, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 500 }}>
          Build & Runtime Logs
        </h3>
        <StatusBadge status={status} />
      </div>

      <div
        style={{
          backgroundColor: '#050505',
          color: '#3ecf8e',
          padding: '16px',
          borderRadius: '10px',
          fontFamily: MONO,
          fontSize: '12.5px',
          lineHeight: '1.7',
          height: '440px',
          overflowY: 'auto',
          border: '1px solid rgba(62,207,142,0.1)',
          boxShadow: 'inset 0 2px 8px 0 rgba(0,0,0,0.6)',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#3f3f46', fontStyle: 'italic' }}>
            {active ? '$ starting container process...' : '$ waiting for deployment trigger...'}
            <span style={{ animation: 'blink 1s step-start infinite' }}>▍</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{ marginBottom: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: log.toLowerCase().includes('error') || log.includes('❌') ? '#f87171' : '#d4d4d8' }}
            >
              <span style={{ color: '#3ecf8e', marginRight: '10px', userSelect: 'none', opacity: 0.6 }}>{(index + 1).toString().padStart(2, '0')}</span>
              {log}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
