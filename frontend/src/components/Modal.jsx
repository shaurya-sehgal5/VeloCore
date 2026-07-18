import React from 'react';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: '20px',
};

const boxStyle = {
  backgroundColor: '#0c0d0e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  padding: '24px',
  width: '100%',
};

export default function Modal({ maxWidth = '440px', accent, children }) {
  return (
    <div style={overlayStyle}>
      <div style={{ ...boxStyle, maxWidth, ...(accent ? { border: `1px solid ${accent}` } : {}) }}>{children}</div>
    </div>
  );
}
