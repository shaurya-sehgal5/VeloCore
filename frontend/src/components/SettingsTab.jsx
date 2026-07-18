import React from 'react';
import { MONO } from '../config';

const cardShellStyle = { backgroundColor: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(12px)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' };
const sectionLabelStyle = { margin: '0 0 16px 0', fontSize: '13px', fontFamily: MONO, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 500 };

export default function SettingsTab({ githubUser, onDisconnect, deploymentsCount, reposCount, onDeleteAccountClick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }} className="vc-grid">
      <div style={cardShellStyle}>
        <h3 style={sectionLabelStyle}>Account</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(62,207,142,0.12)',
                border: '1px solid rgba(62,207,142,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3ecf8e',
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: MONO,
              }}
            >
              {(githubUser || 'D').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fafafa' }}>{githubUser || 'Developer'}</div>
              <div style={{ fontSize: '12px', color: '#52525b', fontFamily: MONO }}>connected via github</div>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            style={{ fontFamily: MONO, fontSize: '12.5px', color: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', padding: '8px 14px', borderRadius: '7px', cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
        <p style={{ fontSize: '12.5px', color: '#52525b', lineHeight: 1.6, margin: 0 }}>
          Disconnecting revokes VeloCore's read-only access to your GitHub repositories and signs you out of this session.
        </p>
      </div>

      <div style={cardShellStyle}>
        <h3 style={sectionLabelStyle}>About</h3>
        {[
          ['Platform', 'VeloCore'],
          ['Deployed projects', deploymentsCount],
          ['Active repositories', reposCount],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0' }}>
            <span style={{ color: '#52525b' }}>{label}</span>
            <span style={{ fontFamily: MONO, color: '#e4e4e7' }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ ...cardShellStyle, gridColumn: '1 / -1', border: '1px solid rgba(248,113,113,0.25)', backgroundColor: 'rgba(248,113,113,0.03)' }}>
        <h3 style={{ ...sectionLabelStyle, color: '#f87171' }}>Danger Zone</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '12.5px', color: '#a1a1aa', lineHeight: 1.6, margin: 0, maxWidth: '480px' }}>
            Permanently delete your VeloCore account, including all deployment records and stored GitHub credentials. This cannot be undone.
          </p>
          <button
            onClick={onDeleteAccountClick}
            style={{ fontFamily: MONO, fontSize: '12.5px', fontWeight: 600, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer' }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
