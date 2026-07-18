import React from 'react';
import { MONO } from '../config';

const labelStyle = { margin: 0, fontSize: '11px', fontFamily: MONO, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 500 };

const inputStyle = (disabled) => ({
  width: '100%',
  backgroundColor: disabled ? 'rgba(255,255,255,0.02)' : '#050505',
  color: disabled ? '#52525b' : '#d4d4d8',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
  padding: '7px 10px',
  fontFamily: MONO,
  fontSize: '12.5px',
  boxSizing: 'border-box',
  cursor: disabled ? 'not-allowed' : 'text',
});

const addButtonStyle = {
  width: '100%',
  padding: '9px',
  marginTop: '4px',
  borderRadius: '7px',
  border: '1px dashed rgba(62,207,142,0.35)',
  backgroundColor: 'transparent',
  color: '#3ecf8e',
  fontFamily: MONO,
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
};

export default function EnvVarTable({ rows, onChangeRow, onAddRow, onRemoveRow, readOnly = false, masked = false }) {
  const cols = readOnly ? '1fr 1fr' : '1fr 1fr 28px';
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '8px', marginBottom: '8px' }}>
        <span style={labelStyle}>Key</span>
        <span style={labelStyle}>Value</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
          <input value={row.key} onChange={(e) => onChangeRow(row.id, 'key', e.target.value)} placeholder="KEY" disabled={readOnly} style={inputStyle(readOnly)} />
          <input
            value={masked ? '••••••••' : row.value}
            onChange={(e) => onChangeRow(row.id, 'value', e.target.value)}
            placeholder="VALUE"
            disabled={readOnly}
            style={inputStyle(readOnly)}
          />
          {!readOnly && (
            <button onClick={() => onRemoveRow(row.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px' }} aria-label="Remove variable">
              ✕
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button onClick={onAddRow} style={addButtonStyle}>
          + Add Variable
        </button>
      )}
    </div>
  );
}
