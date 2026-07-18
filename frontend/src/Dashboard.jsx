import React, { useState } from 'react';
import { DASH_BASE, ENV_BASE, MONO, FREE_TIER_LIMIT } from './config';
import { genId, rowsToObject } from './utils';
import { isBusyStatus } from './statusMeta';
import useDeployments from './hooks/useDeployments';
import useLiveLogs from './hooks/useLiveLogs';
import DeploymentTable from './components/DeploymentTable';
import DeploymentDetails from './components/DeploymentDetails';
import RepoList from './components/RepoList';
import LogsTab from './components/LogsTab';
import SettingsTab from './components/SettingsTab';
import DeployModal from './components/DeployModal';
import Modal from './components/Modal';

const DEFAULT_ENV_ROWS = () => [
  { id: genId(), key: 'VITE_API_URL', value: '' },
  { id: genId(), key: 'PORT', value: '8080' },
  { id: genId(), key: 'DATABASE_URL', value: '' },
  { id: genId(), key: 'JWT_SECRET', value: '' },
];

const TABS = [
  { key: 'deployed', label: 'Deployed' },
  { key: 'repos', label: 'Repos' },
  { key: 'logs', label: 'Live Logs' },
  { key: 'settings', label: 'Settings' },
];

export default function Dashboard({ githubUser, userId, repos, onDeploy, loadingRepos, onDisconnect }) {
  const [activeTab, setActiveTab] = useState('deployed');
  const [viewingDeployment, setViewingDeployment] = useState(null);

  const { deployments, loading: loadingDeployments, error: deploymentsError, deletingId, fetchDeployments, deleteDeployment } = useDeployments();
  const { activeDeploymentId, logs, status, startWatching } = useLiveLogs(fetchDeployments);
  const isBusy = isBusyStatus(status);
  const activeCount = deployments.filter((d) => d.status === 'RUNNING').length;

  // ---------- deploy modal (project name + env vars) ----------
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [deployModalRepo, setDeployModalRepo] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [modalEnvRows, setModalEnvRows] = useState([]);
  const [deployingModal, setDeployingModal] = useState(false);

  const handleDeployClick = (repo) => {
    if (activeCount >= FREE_TIER_LIMIT) return setShowLimitPopup(true);
    setDeployModalRepo(repo);
    setProjectName(repo.name);
    setModalEnvRows(DEFAULT_ENV_ROWS());
    setShowDeployModal(true);
  };

  const handleConfirmDeploy = async () => {
    if (!deployModalRepo) return;
    setDeployingModal(true);
    try {
      const buildData = await onDeploy(deployModalRepo.name, deployModalRepo.clone_url, projectName);
      if (!buildData?.deploymentId) throw new Error('Backend did not return a valid deploymentId.');
      await fetch(`${ENV_BASE}/${buildData.deploymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(rowsToObject(modalEnvRows)),
      });
      setShowDeployModal(false);
      setViewingDeployment(null);
      startWatching(buildData.deploymentId);
      setActiveTab('logs');
    } catch (err) {
      console.error('[Deploy Error]:', err.message);
      alert(`Failed to start deployment: ${err.message}`);
    } finally {
      setDeployingModal(false);
    }
  };

  // ---------- delete account ----------
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setDeletingAccount(true);
    try {
      const res = await fetch(`${DASH_BASE}/purge-account/${userId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      onDisconnect();
    } catch (err) {
      console.error('[Delete Account Error]:', err.message);
      alert('Failed to delete your account. Please try again.');
      setDeletingAccount(false);
      setShowDeleteAccountConfirm(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100svh',
        width: '100%',
        backgroundColor: '#08090a',
        backgroundImage: 'radial-gradient(circle at 15% 0%, rgba(62,207,142,0.06) 0%, transparent 45%), radial-gradient(circle at 85% 100%, rgba(62,207,142,0.04) 0%, transparent 40%)',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#e4e4e7',
        padding: '32px clamp(16px, 4vw, 48px)',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.08em', color: '#3ecf8e', textTransform: 'uppercase', marginBottom: '6px' }}>velocore // dashboard</div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#fafafa' }}>
            Welcome, <span style={{ color: '#3ecf8e' }}>{githubUser || 'Developer'}</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#71717a', fontSize: '13.5px' }}>Manage and deploy your projects in real-time.</p>
        </div>
        <button
          onClick={onDisconnect}
          style={{ fontFamily: MONO, fontSize: '13px', color: '#a1a1aa', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span style={{ fontSize: '14px' }}>⏻</span> logout
        </button>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '5px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const showBusyDot = t.key === 'logs' && isBusy;
          return (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setViewingDeployment(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: MONO,
                fontSize: '12.5px',
                fontWeight: 600,
                color: isActive ? '#08090a' : '#a1a1aa',
                background: isActive ? '#3ecf8e' : 'transparent',
              }}
            >
              {t.label}
              {showBusyDot && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#08090a' : '#facc15', animation: 'dashPulse 1.2s ease-in-out infinite' }} />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'deployed' && !viewingDeployment && (
        <DeploymentTable
          deployments={deployments}
          loading={loadingDeployments}
          error={deploymentsError}
          deletingId={deletingId}
          onOpenDetails={setViewingDeployment}
          onDelete={deleteDeployment}
        />
      )}

      {activeTab === 'deployed' && viewingDeployment && (
        <DeploymentDetails
          deployment={viewingDeployment}
          onBack={() => setViewingDeployment(null)}
          onDeleted={deleteDeployment}
          onRefreshDeployments={fetchDeployments}
          logsState={{ activeDeploymentId, logs, status }}
          startWatchingLogs={startWatching}
        />
      )}

      {activeTab === 'repos' && (
        <div style={{ backgroundColor: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(12px)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '13px', fontFamily: MONO, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 500 }}>
            Repositories <span style={{ color: '#3ecf8e' }}>({repos?.length || 0})</span>
          </h3>
          <RepoList repos={repos} loading={loadingRepos} isBusy={isBusy} onDeploy={handleDeployClick} />
        </div>
      )}

      {activeTab === 'logs' && (
        <div style={{ backgroundColor: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(12px)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <LogsTab status={status} logs={logs} active={!!activeDeploymentId} />
        </div>
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          githubUser={githubUser}
          onDisconnect={onDisconnect}
          deploymentsCount={deployments.length}
          reposCount={repos?.length || 0}
          onDeleteAccountClick={() => setShowDeleteAccountConfirm(true)}
        />
      )}

      {showDeployModal && (
        <DeployModal
          repo={deployModalRepo}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          envRows={modalEnvRows}
          onChangeRow={(id, field, val) => setModalEnvRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)))}
          onAddRow={() => setModalEnvRows((prev) => [...prev, { id: genId(), key: '', value: '' }])}
          onRemoveRow={(id) => setModalEnvRows((prev) => prev.filter((r) => r.id !== id))}
          deploying={deployingModal}
          onCancel={() => setShowDeployModal(false)}
          onConfirm={handleConfirmDeploy}
        />
      )}

      {showLimitPopup && (
        <Modal maxWidth="380px" accent="rgba(250,204,21,0.35)">
          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#facc15', fontWeight: 600 }}>Free-tier limit reached</h3>
          <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 18px 0' }}>
            You already have {activeCount} running deployment{activeCount === 1 ? '' : 's'}, and the free tier allows {FREE_TIER_LIMIT}. Stop or
            delete an existing deployment before creating a new one.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowLimitPopup(false)}
              style={{ fontFamily: MONO, fontSize: '12.5px', fontWeight: 600, color: '#08090a', backgroundColor: '#3ecf8e', border: 'none', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </Modal>
      )}

      {showDeleteAccountConfirm && (
        <Modal>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#fafafa', fontWeight: 600 }}>Delete your account?</h3>
          <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 18px 0' }}>
            This will permanently remove your account, deployment history, and GitHub token from VeloCore. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => setShowDeleteAccountConfirm(false)}
              disabled={deletingAccount}
              style={{ fontFamily: MONO, fontSize: '12.5px', color: '#a1a1aa', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount || !userId}
              style={{
                fontFamily: MONO,
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#08090a',
                backgroundColor: '#f87171',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '7px',
                cursor: deletingAccount ? 'not-allowed' : 'pointer',
                opacity: deletingAccount ? 0.6 : 1,
              }}
            >
              {deletingAccount ? 'Deleting...' : 'Yes, delete permanently'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes dashPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @media (max-width: 900px) { .vc-grid { grid-template-columns: 1fr !important; } }

        .repo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 900px) { .repo-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .repo-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
