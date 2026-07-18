import React from 'react';
import { getStatusStyle } from '../statusMeta';
import { MONO } from '../config';

const SIZES = {
  sm: { fontSize: '11px', padding: '3px 9px' },
  lg: { fontSize: '13px', padding: '6px 14px', borderRadius: '8px' },
};

function StatusBadge({ status, size = 'sm' }) {
  const s = getStatusStyle(status);
  return (
    <span
      style={{
        fontFamily: MONO,
        fontWeight: 600,
        textTransform: 'uppercase',
        backgroundColor: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        borderRadius: '9999px',
        whiteSpace: 'nowrap',
        ...SIZES[size],
      }}
    >
      {status || 'UNKNOWN'}
    </span>
  );
}

export default React.memo(StatusBadge);
