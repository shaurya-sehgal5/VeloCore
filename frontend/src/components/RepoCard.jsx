import React, { useState } from 'react';
import { MONO } from '../config';

function RepoCard({ repo, isBusy, onDeploy }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px',
        borderRadius: '12px',
        border: `1px solid ${hover ? 'rgba(62,207,142,0.35)' : 'rgba(255,255,255,0.07)'}`,
        backgroundColor: hover ? 'rgba(62,207,142,0.04)' : 'rgba(255,255,255,0.015)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover ? '0 8px 20px rgba(0,0,0,0.25)' : 'none',
        transition: 'all 0.18s ease',
        minWidth: 0,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontWeight: 600, color: '#fafafa', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.name}</span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#52525b', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '16px' }}>
          {repo.description || repo.clone_url}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onDeploy}
          disabled={isBusy}
          style={{
            backgroundColor: isBusy ? 'rgba(62,207,142,0.15)' : '#3ecf8e',
            color: isBusy ? '#3ecf8e' : '#08090a',
            border: 'none',
            padding: '7px 18px',
            borderRadius: '9999px',
            fontSize: '12.5px',
            fontWeight: 700,
            fontFamily: MONO,
            cursor: isBusy ? 'not-allowed' : 'pointer',
          }}
        >
          {isBusy ? 'Busy' : 'Deploy'}
        </button>
      </div>
    </div>
  );
}

export default React.memo(RepoCard);
