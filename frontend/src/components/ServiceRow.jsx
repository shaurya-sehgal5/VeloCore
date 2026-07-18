import React, { useState } from 'react';
import { getStatusStyle } from '../statusMeta';
import { formatFramework } from '../utils';
import { MONO } from '../config';

const btnStyle = {
  fontFamily: MONO,
  fontSize: '11.5px',
  color: '#a1a1aa',
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '6px 12px',
  borderRadius: '7px',
  cursor: 'pointer',
};

function ServiceRow({ service, isLast }) {
  const [copied, setCopied] = useState(false);
  const style = getStatusStyle(service.status);
  const hasUrl = Boolean(service.url);

  const handleCopy = async () => {
    if (!hasUrl) return;
    try {
      await navigator.clipboard.writeText(service.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('[Clipboard Error]:', err.message);
    }
  };

  return (
    <div style={{ padding: '16px 0', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: style.fg, flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: '#fafafa', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {service.name.charAt(0).toUpperCase() + service.name.slice(1)}
          </span>
        </div>
        <span
          style={{
            fontSize: '10.5px',
            fontFamily: MONO,
            fontWeight: 600,
            textTransform: 'uppercase',
            backgroundColor: style.bg,
            color: style.fg,
            border: `1px solid ${style.border}`,
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
        >
          {service.status}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: '#71717a', fontFamily: MONO, marginBottom: hasUrl ? '4px' : '10px' }}>{formatFramework(service.framework)}</div>

      {hasUrl && <div style={{ fontSize: '12.5px', color: '#3ecf8e', fontFamily: MONO, marginBottom: '10px', wordBreak: 'break-all' }}>{service.url}</div>}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {hasUrl && (
          <a href={service.url} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}>
            Open
          </a>
        )}
        {hasUrl && (
          <button onClick={handleCopy} style={btnStyle}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(ServiceRow);
