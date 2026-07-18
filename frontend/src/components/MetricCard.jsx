import React from 'react';
import { MONO } from '../config';

function MetricCard({ label, value, accent }) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(12px)',
        padding: '14px',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${accent || '#3f3f46'}`,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: '11px', fontFamily: MONO, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: accent || '#e4e4e7', fontFamily: MONO }}>{value ?? '—'}</div>
    </div>
  );
}

export default React.memo(MetricCard);
