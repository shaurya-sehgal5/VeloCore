import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import OverviewTab from './OverviewTab';
import LogsTab from './LogsTab';
import MonitoringTab from './MonitoringTab';
import Modal from './Modal';
import useDeploymentRuntime from '../hooks/useDeploymentRuntime';
import useEnvVars from '../hooks/useEnvVars';
import { REDEPLOY_BASE, ACTION_BASE, MONO } from '../config';

const backBtnStyle = { fontFamily: MONO, fontSize: '12.5px', color: '#a1a1aa', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 };
const tabBtnStyle = (active) => ({ padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: '12px', fontWeight: 600, color: active ? '#08090a' : '#a1a1aa', background: active ? '#3ecf8e' : 'rgba(255,255,255,0.04)' });
const cardShellStyle = { backgroundColor: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(12px)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' };
const cancelBtnStyle = { fontFamily: MONO, fontSize: '12.5px', color: '#a1a1aa', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer' };
const dangerBtnStyle = (busy) => ({ fontFamily: MONO, fontSize: '12.5px', fontWeight: 600, color: '#08090a', backgroundColor: '#f87171', border: 'none', padding: '9px 16px', borderRadius: '7px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 });

export default function DeploymentDetails({ deployment, onBack, onDeleted, onRefreshDeployments, logsState, startWatchingLogs }) {
  const [tab, setTab] = useState('overview');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { services, servicesLoading, servicesError, runtimeEngine, metrics } = useDeploymentRuntime(deployment.id, {
    poll: tab === 'overview' || tab === 'monitoring',
  });

  const {
    rows: envRows,
    editing: envEditing,
    loading: envLoading,
    saving: envSaving,
    startEdit,
    cancelEdit,
    changeRow,
    addRow,
    removeRow,
    save: saveEnv,
    ensureLoaded,
  } = useEnvVars(deployment.id, { autoLoad: tab === 'overview' });

  const handleRedeploy = async () => {
    setActionInProgress('redeploy');
    try {
      const rows = await ensureLoaded();
      await saveEnv(rows);
      const res = await fetch(`${REDEPLOY_BASE}/${deployment.id}`, { method: 'POST', credentials: 'include' });
      const data = res.ok ? await res.json() : {};

const targetDeploymentId =
  data.deploymentId || deployment.id;

startWatchingLogs(targetDeploymentId);
await onRefreshDeployments();
setTab("logs");
      setTab('logs');
    } catch (err) {
      console.error('[Redeploy Error]:', err.message);
      alert('Failed to trigger redeployment.');
    } finally {
      setActionInProgress(null);
    }
  };

  // UNCONFIRMED endpoints — restart/stop follow the same POST /api/deploy/<action>/:id
  // shape as the confirmed redeploy route. Point ACTION_BASE at the real routes once known.
  const handleRuntimeAction = async (action) => {
    setActionInProgress(action);
    try {
     const res = await fetch(
  `${ACTION_BASE}/${deployment.id}/${action}`,
  {
    method: "POST",
    credentials: "include",
  }
);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      await onRefreshDeployments();
    } catch (err) {
      console.error(`[Runtime Action: ${action}] Error:`, err.message);
      alert(`Failed to ${action} this deployment.`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    setActionInProgress('delete');
    try {
      await onDeleted(deployment.id);
      setShowDeleteConfirm(false);
      onBack();
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div style={cardShellStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={backBtnStyle}>
          ← Back to Deployed Projects
        </button>
        <StatusBadge status={deployment.status} />
      </div>

      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#fafafa', fontWeight: 600 }}>{deployment.project_name}</h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setTab('overview')} style={tabBtnStyle(tab === 'overview')}>Overview</button>
        <button onClick={() => setTab('logs')} style={tabBtnStyle(tab === 'logs')}>Logs</button>
        <button onClick={() => setTab('monitoring')} style={tabBtnStyle(tab === 'monitoring')}>Monitoring</button>
      </div>

      {tab === 'overview' && (
        <OverviewTab
          deployment={deployment}
          runtimeEngine={runtimeEngine}
          services={services}
          servicesLoading={servicesLoading}
          servicesError={servicesError}
          envRows={envRows}
          envEditing={envEditing}
          envLoading={envLoading}
          envSaving={envSaving}
          onEditEnv={startEdit}
          onCancelEnv={cancelEdit}
          onSaveEnv={() => saveEnv()}
          onChangeEnvRow={changeRow}
          onAddEnvRow={addRow}
          onRemoveEnvRow={removeRow}
          onRedeploy={handleRedeploy}
          onRestart={() => handleRuntimeAction('restart')}
          onStop={() => handleRuntimeAction('stop')}
          onDeleteClick={() => setShowDeleteConfirm(true)}
          actionInProgress={actionInProgress}
        />
      )}

      {tab === 'logs' && <LogsTab status={logsState.status} logs={logsState.logs} active={logsState.activeDeploymentId === deployment.id} />}

      {tab === 'monitoring' && <MonitoringTab metrics={metrics} />}

      {showDeleteConfirm && (
        <Modal maxWidth="380px" accent="rgba(248,113,113,0.35)">
          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#f87171', fontWeight: 600 }}>Delete this deployment?</h3>
          <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 18px 0' }}>
            This permanently removes <span style={{ color: '#fafafa' }}>{deployment.project_name}</span> and its deployment history. This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => setShowDeleteConfirm(false)} disabled={actionInProgress === 'delete'} style={cancelBtnStyle}>
              Cancel
            </button>
            <button onClick={handleDeleteConfirmed} disabled={actionInProgress === 'delete'} style={dangerBtnStyle(actionInProgress === 'delete')}>
              {actionInProgress === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
