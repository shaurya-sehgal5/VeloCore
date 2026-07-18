import React from 'react';
import Modal from './Modal';
import EnvVarTable from './EnvVarTable';
import { MONO } from '../config';

const titleStyle = { margin: '0 0 10px 0', fontSize: '15px', color: '#fafafa', fontWeight: 600 };
const labelStyle = { display: 'block', fontSize: '11px', fontFamily: MONO, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' };
const inputStyle = { width: '100%', backgroundColor: '#050505', color: '#e4e4e7', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', fontFamily: MONO, fontSize: '13px', boxSizing: 'border-box', marginBottom: '18px' };
const cancelBtnStyle = { fontFamily: MONO, fontSize: '12.5px', color: '#a1a1aa', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer' };
const primaryBtnStyle = { fontFamily: MONO, fontSize: '12.5px', fontWeight: 600, color: '#08090a', backgroundColor: '#3ecf8e', border: 'none', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer' };

export default function DeployModal({ repo, projectName, onProjectNameChange, envRows, onChangeRow, onAddRow, onRemoveRow, deploying, onCancel, onConfirm }) {
  if (!repo) return null;
  return (
    <Modal maxWidth="560px">
      <h3 style={titleStyle}>Deployment Configuration</h3>

      <label style={labelStyle}>Project Name</label>
      <input value={projectName} onChange={(e) => onProjectNameChange(e.target.value)} style={inputStyle} />

      <span style={{ ...labelStyle, marginBottom: '10px' }}>Environment Variables</span>
      <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
        <EnvVarTable rows={envRows} onChangeRow={onChangeRow} onAddRow={onAddRow} onRemoveRow={onRemoveRow} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
        <button onClick={onCancel} disabled={deploying} style={cancelBtnStyle}>Cancel</button>
        <button onClick={onConfirm} disabled={deploying} style={{ ...primaryBtnStyle, opacity: deploying ? 0.6 : 1, cursor: deploying ? 'not-allowed' : 'pointer' }}>
          {deploying ? 'Deploying...' : 'Deploy'}
        </button>
      </div>
    </Modal>
  );
}
