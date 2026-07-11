import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const AUTH_BASE = 'http://localhost:8080/api/auth';
const DASH_BASE = 'http://localhost:8080/api/dashboard';
const ENV_BASE = 'http://localhost:8080/api/env';
const SERVICES_BASE = 'http://localhost:8080/api/deployments';
const ANALYTICS_URL = 'http://localhost:8080/api/deployments/runtime';
const REDEPLOY_BASE = 'http://localhost:8080/api/deploy/redeploy';
const FREE_TIER_LIMIT = 2;
const MONO = "'JetBrains Mono', monospace";

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_ENV_ROWS = () => [
  { id: genId(), key: 'VITE_API_URL', value: '' },
  { id: genId(), key: 'PORT', value: '8080' },
  { id: genId(), key: 'DATABASE_URL', value: '' },
  { id: genId(), key: 'JWT_SECRET', value: '' },
];

const objectToRows = (obj) => Object.entries(obj || {}).map(([key, value]) => ({ id: genId(), key, value: String(value) }));
const rowsToObject = (rows) =>
  rows.reduce((acc, r) => {
    if (r.key.trim()) acc[r.key.trim()] = r.value;
    return acc;
  }, {});
const updateRows = (setRows, id, field, value) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
const addRow = (setRows) => setRows((prev) => [...prev, { id: genId(), key: '', value: '' }]);
const removeRowFrom = (setRows, id) => setRows((prev) => prev.filter((r) => r.id !== id));

// Splits backend strings like "2.48kB / 5.57kB" into ["2.48kB", "5.57kB"].
const splitPair = (str) => {
  if (!str || typeof str !== 'string') return ['—', '—'];
  const [a, b] = str.split('/').map((s) => s.trim());
  return [a || '—', b || '—'];
};

const formatStarted = (val) => {
  if (!val) return '—';
  const date = new Date(val);
  if (isNaN(date.getTime())) return String(val); // backend already sent a formatted string like "8m ago"
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
};

const FRAMEWORK_LABELS = { express: 'Express', fastify: 'Fastify', 'vite-react': 'Vite React', nextjs: 'Next.js', bullmq: 'BullMQ', django: 'Django', flask: 'Flask' };
const formatFramework = (fw) => FRAMEWORK_LABELS[fw] || (fw ? fw.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');

// Single source of truth for every deployment status this app can show.
const STATUS_META = {
  QUEUED: { fg: '#a1a1aa', bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.3)', busy: true },
  CLONING: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', busy: true },
  SCANNING: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', busy: true },
  BUILDING: { fg: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)', busy: true },
  DEPLOYING: { fg: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)', busy: true },
  RUNNING: { fg: '#3ecf8e', bg: 'rgba(62,207,142,0.12)', border: 'rgba(62,207,142,0.4)', busy: false },
  FAILED: { fg: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.4)', busy: false, terminal: true },
  STOPPED: { fg: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', busy: false, terminal: true },
  IDLE: { fg: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', busy: false },
};
const getStatusStyle = (status) => STATUS_META[status] || STATUS_META.IDLE;

const TABS = [
  { key: 'deployed', label: 'Deployed', d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', circle: true },
  { key: 'repos', label: 'Repos', d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' },
  { key: 'logs', label: 'Live Logs', d: 'M12 19h8M4 17l6-6-6-6', poly: true },
  { key: 'settings', label: 'Settings', gear: true },
];

// Compact multi-path icon renderer so TABS doesn't need a full inline SVG per entry.
function TabIcon({ tab, color }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (tab.key === 'deployed') return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></svg>;
  if (tab.key === 'repos') return <svg {...common}><path d={tab.d} /></svg>;
  if (tab.key === 'logs') return <svg {...common}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>;
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ---------- shared style tokens ----------
const cardShellStyle = { backgroundColor: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(12px)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0 };
const sectionLabelStyle = { margin: '0 0 16px 0', fontSize: '13px', fontFamily: MONO, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 500 };
const mutedTextStyle = { color: '#52525b', fontSize: '13.5px', fontFamily: MONO };
const errorTextStyle = { ...mutedTextStyle, color: '#f87171' };
const modalOverlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' };
const modalBoxStyle = { backgroundColor: '#0c0d0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '24px', maxWidth: '440px', width: '100%' };
const modalTitleStyle = { margin: '0 0 10px 0', fontSize: '15px', color: '#fafafa', fontWeight: 600 };
const modalSubtitleStyle = { fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 18px 0' };
const btnBase = { fontFamily: MONO, fontSize: '12.5px', border: 'none', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer' };
const modalCancelButtonStyle = { ...btnBase, color: '#a1a1aa', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' };
const modalPrimaryButtonStyle = { ...btnBase, fontWeight: 600, color: '#08090a', backgroundColor: '#3ecf8e' };
const fieldLabelStyle = { display: 'block', fontSize: '11px', fontFamily: MONO, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' };
const fieldInputStyle = { width: '100%', backgroundColor: '#050505', color: '#e4e4e7', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', fontFamily: MONO, fontSize: '13px', boxSizing: 'border-box' };
const envInputStyle = (disabled) => ({ width: '100%', backgroundColor: disabled ? 'rgba(255,255,255,0.02)' : '#050505', color: disabled ? '#52525b' : '#d4d4d8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '7px 10px', fontFamily: MONO, fontSize: '12.5px', boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'text' });
const envAddButtonStyle = { width: '100%', padding: '9px', marginTop: '4px', borderRadius: '7px', border: '1px dashed rgba(62,207,142,0.35)', backgroundColor: 'transparent', color: '#3ecf8e', fontFamily: MONO, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' };
const subTabButtonStyle = (isActive) => ({ padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: '12px', fontWeight: 600, color: isActive ? '#08090a' : '#a1a1aa', background: isActive ? '#3ecf8e' : 'rgba(255,255,255,0.04)' });
const backButtonStyle = { fontFamily: MONO, fontSize: '12.5px', color: '#a1a1aa', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 };
const badgeStyle = (s) => ({ fontSize: '11px', fontFamily: MONO, fontWeight: 600, textTransform: 'uppercase', backgroundColor: s.bg, color: s.fg, border: `1px solid ${s.border}`, padding: '3px 9px', borderRadius: '9999px', whiteSpace: 'nowrap' });
const rowBetween = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

// Compact accent-colored action button (used for Deploy / Details) so buttons size to
// their label instead of stretching to fill the card.
const actionButtonStyle = (accent, isBusy) => ({
  fontFamily: MONO,
  fontSize: '12px',
  fontWeight: 600,
  border: `1px solid ${isBusy ? 'rgba(255,255,255,0.1)' : `${accent}66`}`,
  backgroundColor: isBusy ? 'rgba(255,255,255,0.04)' : `${accent}1a`,
  color: isBusy ? '#71717a' : accent,
  padding: '7px 14px',
  borderRadius: '7px',
  cursor: isBusy ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

function Modal({ maxWidth = '440px', accent, children }) {
  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalBoxStyle, maxWidth, ...(accent ? { border: `1px solid ${accent}` } : {}) }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ ...rowBetween, fontSize: '13px', padding: '6px 0' }}>
      <span style={{ color: '#52525b' }}>{label}</span>
      <span style={{ fontFamily: MONO, color: '#e4e4e7' }}>{value ?? '—'}</span>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div style={{ ...cardShellStyle, padding: '14px', borderLeft: `3px solid ${accent || '#3f3f46'}` }}>
      <div style={{ fontSize: '11px', fontFamily: MONO, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: accent || '#e4e4e7', fontFamily: MONO }}>{value}</div>
    </div>
  );
}

// Shared KEY/VALUE table used by both the deploy modal and the details "Environment Variables" tab.
function EnvVarTable({ rows, onChangeRow, onAddRow, onRemoveRow, readOnly = false, masked = false }) {
  const cols = readOnly ? '1fr 1fr' : '1fr 1fr 28px';
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '8px', marginBottom: '8px' }}>
        <span style={{ ...sectionLabelStyle, margin: 0, fontSize: '11px' }}>Key</span>
        <span style={{ ...sectionLabelStyle, margin: 0, fontSize: '11px' }}>Value</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
          <input value={row.key} onChange={(e) => onChangeRow(row.id, 'key', e.target.value)} placeholder="KEY" disabled={readOnly} style={envInputStyle(readOnly)} />
          <input value={masked ? '••••••••' : row.value} onChange={(e) => onChangeRow(row.id, 'value', e.target.value)} placeholder="VALUE" disabled={readOnly} style={envInputStyle(readOnly)} />
          {!readOnly && (
            <button onClick={() => onRemoveRow(row.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px' }} aria-label="Remove variable">
              ✕
            </button>
          )}
        </div>
      ))}
      {!readOnly && <button onClick={onAddRow} style={envAddButtonStyle}>+ Add Variable</button>}
    </div>
  );
}

// One row per service from the runtime services endpoint. Services without a URL (workers, etc.)
// automatically skip the Open/Copy buttons.
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
      <div style={{ ...rowBetween, marginBottom: '6px', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: style.fg, flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: '#fafafa', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {service.name.charAt(0).toUpperCase() + service.name.slice(1)}
          </span>
        </div>
        <span style={badgeStyle(style)}>{service.status}</span>
      </div>

      <div style={{ fontSize: '12px', color: '#71717a', fontFamily: MONO, marginBottom: hasUrl ? '4px' : '10px' }}>{formatFramework(service.framework)}</div>

      {hasUrl && <div style={{ fontSize: '12.5px', color: '#3ecf8e', fontFamily: MONO, marginBottom: '10px', wordBreak: 'break-all' }}>{service.url}</div>}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {hasUrl && (
          <a href={service.url} target="_blank" rel="noopener noreferrer" style={{ ...modalCancelButtonStyle, textDecoration: 'none', padding: '6px 12px', fontSize: '11.5px', display: 'inline-block' }}>
            Open
          </a>
        )}
        {hasUrl && (
          <button onClick={handleCopy} style={{ ...modalCancelButtonStyle, padding: '6px 12px', fontSize: '11.5px' }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
        <button onClick={() => alert('Service-level logs are coming soon.')} style={{ ...modalCancelButtonStyle, padding: '6px 12px', fontSize: '11.5px' }}>
          Logs
        </button>
      </div>
    </div>
  );
}

// One repo card for the 3-per-row grid, with a subtle hover lift.
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
        <button onClick={onDeploy} disabled={isBusy} style={actionButtonStyle('#3ecf8e', isBusy)}>
          Deploy
        </button>
      </div>
    </div>
  );
}

function Dashboard({ githubUser, repos, onDeploy, loadingRepos, onDisconnect }) {
  const [activeTab, setActiveTab] = useState('deployed');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/session`, { credentials: 'include' });
        if (res.ok) setUserId((await res.json()).userId);
      } catch (err) {
        console.error('[Session Fetch Error]:', err.message);
      }
    })();
  }, []);

  // ---------- DEPLOYED PROJECTS ----------
  const [deployments, setDeployments] = useState([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [deploymentsError, setDeploymentsError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch(`${DASH_BASE}/analytics-list`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setDeployments(await res.json());
      setDeploymentsError(null);
    } catch (err) {
      console.error('[Deployments Fetch Error]:', err.message);
      setDeploymentsError('Failed to load deployed projects.');
    } finally {
      setLoadingDeployments(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 5000);
    return () => clearInterval(interval);
  }, [fetchDeployments]);

  const handleDeleteDeployment = async (deploymentId) => {
    setDeletingId(deploymentId);
    try {
      const res = await fetch(`${DASH_BASE}/deployment/${deploymentId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setDeployments((prev) => prev.filter((d) => d.id !== deploymentId));
    } catch (err) {
      console.error('[Delete Deployment Error]:', err.message);
      alert('Failed to delete this application. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- LIVE LOGS (build logs -> runtime logs, same stream) ----------
  const [activeDeploymentId, setActiveDeploymentId] = useState(null);
  const [buildLogs, setBuildLogs] = useState([]);
  const [buildStatus, setBuildStatus] = useState('IDLE');
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buildLogs]);

  useEffect(() => {
    if (!activeDeploymentId) return;
    const socket = io('http://localhost:8080', { withCredentials: true, transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('join-deployment-stream', activeDeploymentId));
    socket.on('live_logs', (payload) => {
      const text = typeof payload === 'object' && payload !== null ? payload.text : payload;
      if (text) setBuildLogs((prev) => [...prev, text]);
    });
    socket.on('status_update', (data) => {
      setBuildStatus(data.status);
      fetchDeployments();
      if (STATUS_META[data.status]?.terminal) socket.disconnect();
    });
    return () => socket.disconnect();
  }, [activeDeploymentId, fetchDeployments]);

  const goToLogs = (deploymentId) => {
    setBuildLogs([]);
    setBuildStatus('QUEUED');
    setActiveDeploymentId(deploymentId);
    setActiveTab('logs');
  };

  const isBusy = getStatusStyle(buildStatus).busy;
  const liveStatusStyle = getStatusStyle(buildStatus);
  const activeCount = deployments.filter((d) => d.status === 'RUNNING').length;

  // ---------- DEPLOY MODAL (project name + env vars) ----------
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
      goToLogs(buildData.deploymentId);
    } catch (err) {
      console.error('[Deploy Error]:', err.message);
      alert(`Failed to start deployment: ${err.message}`);
    } finally {
      setDeployingModal(false);
    }
  };

  // ---------- DEPLOYMENT DETAILS (Services / Analytics / Environment Variables) ----------
  const [viewingDeployment, setViewingDeployment] = useState(null);
  const [detailsSubTab, setDetailsSubTab] = useState('services');

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(null);

  const [analyticsMetrics, setAnalyticsMetrics] = useState(null);
  const [analyticsStatus, setAnalyticsStatus] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  const [envRows, setEnvRows] = useState([]);
  const [envOriginalRows, setEnvOriginalRows] = useState([]);
  const [envLoading, setEnvLoading] = useState(false);
  const [envEditing, setEnvEditing] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);

  const openDetails = (dep) => {
    setViewingDeployment(dep);
    setDetailsSubTab('services');
    setEnvEditing(false);
  };

  const closeDetails = () => {
    setViewingDeployment(null);
    setServices([]);
    setAnalyticsMetrics(null);
  };

  // Services list — polls while the Services tab is open.
  useEffect(() => {
    const id = viewingDeployment?.id;
    if (!id || detailsSubTab !== 'services') return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${SERVICES_BASE}/${id}/runtime`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setServices(data.services || []);
          setServicesError(null);
        }
      } catch (err) {
        console.error('[Services Fetch Error]:', err.message);
        if (!cancelled) {
          setServicesError('Failed to load services.');
          setServices([]);
        }
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    };
    setServicesLoading(true);
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [viewingDeployment?.id, detailsSubTab]);

  // Analytics — polls every 2s while the Analytics tab is open, per spec.
  useEffect(() => {
    const id = viewingDeployment?.id;
    if (!id || detailsSubTab !== 'analytics') return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(ANALYTICS_URL, { credentials: 'include' });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.runtimes || data.deployments || [];
        const match = list.find((r) => r.deploymentId === id || r.id === id);
        if (!cancelled) {
          setAnalyticsMetrics(match || null);
          setAnalyticsStatus(match?.status || null);
          setAnalyticsError(match ? null : 'No runtime data found for this deployment.');
        }
      } catch (err) {
        console.error('[Analytics Fetch Error]:', err.message);
        if (!cancelled) setAnalyticsError('Failed to load analytics.');
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    };
    setAnalyticsLoading(true);
    load();
    const interval = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [viewingDeployment?.id, detailsSubTab]);

  useEffect(() => {
    const id = viewingDeployment?.id;
    if (!id || detailsSubTab !== 'env') return;
    (async () => {
      setEnvLoading(true);
      try {
        const res = await fetch(`${ENV_BASE}/${id}`, { credentials: 'include' });
        const data = res.ok ? await res.json() : {};
        const rows = objectToRows(data);
        setEnvRows(rows);
        setEnvOriginalRows(rows);
      } catch (err) {
        console.error('[Env Fetch Error]:', err.message);
        setEnvRows([]);
        setEnvOriginalRows([]);
      } finally {
        setEnvLoading(false);
      }
    })();
  }, [viewingDeployment?.id, detailsSubTab]);

  // Loads env vars on demand if the Redeploy button (now visible from anywhere on the
  // details page) is pressed before the Environment Variables tab was ever opened.
  const ensureEnvLoaded = async () => {
    if (envRows.length > 0 || envOriginalRows.length > 0) return envRows;
    try {
      const res = await fetch(`${ENV_BASE}/${viewingDeployment.id}`, { credentials: 'include' });
      const data = res.ok ? await res.json() : {};
      const rows = objectToRows(data);
      setEnvRows(rows);
      setEnvOriginalRows(rows);
      return rows;
    } catch (err) {
      console.error('[Env Fetch Error]:', err.message);
      return [];
    }
  };

  const handleSaveEnv = async () => {
    if (!viewingDeployment) return;
    setEnvSaving(true);
    try {
      await fetch(`${ENV_BASE}/${viewingDeployment.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(rowsToObject(envRows)),
      });
      setEnvOriginalRows(envRows);
      setEnvEditing(false);
    } catch (err) {
      console.error('[Env Save Error]:', err.message);
      alert('Failed to save environment variables.');
    } finally {
      setEnvSaving(false);
    }
  };

  const handleRedeploy = async () => {
    if (!viewingDeployment) return;
    setEnvSaving(true);
    try {
      const rows = await ensureEnvLoaded();
      await fetch(`${ENV_BASE}/${viewingDeployment.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(rowsToObject(rows)),
      });
      const res = await fetch(`${REDEPLOY_BASE}/${viewingDeployment.id}`, { method: 'POST', credentials: 'include' });
      const data = res.ok ? await res.json() : {};
      setEnvOriginalRows(rows);
      setEnvEditing(false);
      const deploymentId = viewingDeployment.id;
      closeDetails();
      goToLogs(data.deploymentId || deploymentId);
    } catch (err) {
      console.error('[Redeploy Error]:', err.message);
      alert('Failed to trigger redeployment.');
    } finally {
      setEnvSaving(false);
    }
  };

  // ---------- SETTINGS / DELETE ACCOUNT ----------
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      setShowDeleteConfirm(false);
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
      {/* HEADER */}
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
          style={{ fontFamily: MONO, fontSize: '13px', color: '#a1a1aa', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
        >
          <span style={{ fontSize: '14px' }}>⏻</span> logout
        </button>
      </header>

      {/* TAB BAR */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '5px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const showBusyDot = tab.key === 'logs' && isBusy;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.02em', color: isActive ? '#08090a' : '#a1a1aa', background: isActive ? '#3ecf8e' : 'transparent', transition: 'all 0.2s ease' }}
            >
              <TabIcon tab={tab} color={isActive ? '#08090a' : '#71717a'} />
              {tab.label}
              {showBusyDot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#08090a' : '#facc15', animation: 'dashPulse 1.2s ease-in-out infinite' }} />}
            </button>
          );
        })}
      </div>

      {/* ---------- 1. DEPLOYMENT DETAILS ---------- */}
      {activeTab === 'deployed' && viewingDeployment && (
        <div style={cardShellStyle}>
          <div style={{ ...rowBetween, marginBottom: '16px' }}>
            <button onClick={closeDetails} style={backButtonStyle}>← Back to Deployed Projects</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={badgeStyle(getStatusStyle(viewingDeployment.status))}>{viewingDeployment.status}</span>
              <button onClick={handleRedeploy} disabled={envSaving} style={{ ...modalPrimaryButtonStyle, backgroundColor: '#38bdf8', padding: '7px 14px', fontSize: '12px', opacity: envSaving ? 0.6 : 1 }}>
                {envSaving ? 'Working...' : 'Redeploy'}
              </button>
            </div>
          </div>

          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#fafafa', fontWeight: 600 }}>{viewingDeployment.project_name}</h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button onClick={() => setDetailsSubTab('services')} style={subTabButtonStyle(detailsSubTab === 'services')}>Services</button>
            <button onClick={() => setDetailsSubTab('analytics')} style={subTabButtonStyle(detailsSubTab === 'analytics')}>Analytics</button>
            <button onClick={() => setDetailsSubTab('env')} style={subTabButtonStyle(detailsSubTab === 'env')}>Environment Variables</button>
          </div>

          {detailsSubTab === 'services' && (
            <div>
              <h4 style={{ ...sectionLabelStyle, margin: '0 0 4px 0' }}>Deployment Services</h4>
              {servicesLoading ? (
                <p style={mutedTextStyle}>$ fetching runtime services...</p>
              ) : servicesError ? (
                <p style={errorTextStyle}>$ {servicesError}</p>
              ) : services.length === 0 ? (
                <p style={mutedTextStyle}>$ no services reported for this deployment yet.</p>
              ) : (
                services.map((service, i) => <ServiceRow key={`${service.name}-${i}`} service={service} isLast={i === services.length - 1} />)
              )}
            </div>
          )}

          {detailsSubTab === 'analytics' && (
            <div>
              <h4 style={{ ...sectionLabelStyle, margin: '0 0 14px 0' }}>Deployment Analytics</h4>
              {analyticsLoading && !analyticsMetrics ? (
                <p style={mutedTextStyle}>$ fetching runtime analytics...</p>
              ) : analyticsError && !analyticsMetrics ? (
                <p style={errorTextStyle}>$ {analyticsError}</p>
              ) : !analyticsMetrics ? (
                <p style={mutedTextStyle}>$ no analytics reported yet.</p>
              ) : (
                <>
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ ...sectionLabelStyle, fontSize: '11px', margin: '0 0 8px 0' }}>Status</div>
                    <span style={{ ...badgeStyle(getStatusStyle(analyticsStatus)), fontSize: '13px', padding: '6px 14px', borderRadius: '8px' }}>
                      {analyticsStatus || 'UNKNOWN'}
                    </span>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ ...sectionLabelStyle, fontSize: '11px', margin: '0 0 8px 0' }}>Resource Usage</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                      <MetricCard label="CPU" value={analyticsMetrics.metrics?.cpu ?? '0.00%'} accent="#3ecf8e" />
                      <MetricCard label="Memory" value={analyticsMetrics.metrics?.memory ?? '—'} accent="#38bdf8" />
                      <MetricCard label="Memory %" value={analyticsMetrics.metrics?.memoryPercent ?? '—'} accent="#38bdf8" />
                      <MetricCard label="PIDs" value={analyticsMetrics.metrics?.pids ?? '—'} accent="#71717a" />
                    </div>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ ...sectionLabelStyle, fontSize: '11px', margin: '0 0 8px 0' }}>Network</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                      {(() => {
                        const [up, down] = splitPair(analyticsMetrics.metrics?.netIO);
                        return (
                          <>
                            <MetricCard label="Upload" value={up} accent="#a78bfa" />
                            <MetricCard label="Download" value={down} accent="#a78bfa" />
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ ...sectionLabelStyle, fontSize: '11px', margin: '0 0 8px 0' }}>Disk IO</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                      {(() => {
                        const [read, write] = splitPair(analyticsMetrics.metrics?.blockIO);
                        return (
                          <>
                            <MetricCard label="Read" value={read} accent="#fb923c" />
                            <MetricCard label="Write" value={write} accent="#fb923c" />
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <div style={{ ...sectionLabelStyle, fontSize: '11px', margin: '0 0 8px 0' }}>Runtime</div>
                    <div style={{ ...cardShellStyle, padding: '14px' }}>
                      <InfoRow label="Container" value={analyticsMetrics.containerName} />
                      <InfoRow label="Image" value={analyticsMetrics.imageName} />
                      <InfoRow label="Port" value={analyticsMetrics.hostPort} />
                      <InfoRow label="Framework" value={formatFramework(analyticsMetrics.framework)} />
                      <InfoRow label="Slot" value={analyticsMetrics.slot} />
                      <InfoRow label="Started" value={formatStarted(analyticsMetrics.startedAt)} />
                      <InfoRow label="Health" value={analyticsMetrics.health} />
                      <InfoRow label="Repository" value={viewingDeployment.repo_name} />
                      <InfoRow label="Deployed At" value={viewingDeployment.created_at ? new Date(viewingDeployment.created_at).toLocaleString() : '—'} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {detailsSubTab === 'env' && (
            <div>
              {envLoading ? (
                <p style={mutedTextStyle}>$ loading environment variables...</p>
              ) : (
                <>
                  <EnvVarTable
                    rows={envRows}
                    readOnly={!envEditing}
                    masked={!envEditing}
                    onChangeRow={(id, field, val) => updateRows(setEnvRows, id, field, val)}
                    onAddRow={() => addRow(setEnvRows)}
                    onRemoveRow={(id) => removeRowFrom(setEnvRows, id)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    {envEditing ? (
                      <>
                        <button onClick={() => { setEnvRows(envOriginalRows); setEnvEditing(false); }} disabled={envSaving} style={modalCancelButtonStyle}>Cancel</button>
                        <button onClick={handleSaveEnv} disabled={envSaving} style={{ ...modalPrimaryButtonStyle, opacity: envSaving ? 0.6 : 1 }}>{envSaving ? 'Saving...' : 'Save'}</button>
                      </>
                    ) : (
                      <button onClick={() => setEnvEditing(true)} style={modalCancelButtonStyle}>Edit</button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------- 1b. DEPLOYED PROJECTS LIST ---------- */}
      {activeTab === 'deployed' && !viewingDeployment && (
        <div style={cardShellStyle}>
          <h3 style={sectionLabelStyle}>
            Deployed Projects <span style={{ color: '#3ecf8e' }}>({deployments.length})</span>
          </h3>

          {loadingDeployments ? (
            <p style={mutedTextStyle}>$ fetching deployment records from database...</p>
          ) : deploymentsError ? (
            <p style={errorTextStyle}>$ {deploymentsError}</p>
          ) : deployments.length === 0 ? (
            <p style={mutedTextStyle}>$ no deployments yet — deploy a repo from the Repos tab.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
              {deployments.map((dep) => (
                <div key={dep.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)', minWidth: 0 }}>
                  <div style={{ ...rowBetween, alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontWeight: 600, color: '#fafafa', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.project_name}</span>
                    <span style={badgeStyle(getStatusStyle(dep.status))}>{dep.status}</span>
                  </div>

                  <span style={{ fontSize: '11.5px', color: '#52525b', fontFamily: MONO }}>view Details for live service URLs →</span>

                  <div style={{ ...rowBetween, gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#52525b', fontFamily: MONO }}>{dep.created_at ? new Date(dep.created_at).toLocaleString() : ''}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openDetails(dep)} style={actionButtonStyle('#38bdf8', false)}>Details</button>
                      <button
                        onClick={() => handleDeleteDeployment(dep.id)}
                        disabled={deletingId === dep.id}
                        style={actionButtonStyle('#f87171', deletingId === dep.id)}
                      >
                        {deletingId === dep.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- 2. REPOS TAB ---------- */}
      {activeTab === 'repos' && (
        <div style={cardShellStyle}>
          <h3 style={sectionLabelStyle}>
            Repositories <span style={{ color: '#3ecf8e' }}>({repos?.length || 0})</span>
          </h3>

          {loadingRepos ? (
            <p style={mutedTextStyle}>$ fetching repositories from github...</p>
          ) : (
            <div className="repo-grid">
              {repos?.map((repo) => (
                <RepoCard key={repo.id} repo={repo} isBusy={isBusy} onDeploy={() => handleDeployClick(repo)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- 3. LIVE LOGS TAB ---------- */}
      {activeTab === 'logs' && (
        <div style={{ ...cardShellStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...rowBetween, marginBottom: '16px' }}>
            <h3 style={{ ...sectionLabelStyle, margin: 0 }}>Build & Runtime Logs</h3>
            <span style={{ ...badgeStyle(liveStatusStyle), fontSize: '11.5px', padding: '4px 10px' }}>{buildStatus}</span>
          </div>

          <div style={{ backgroundColor: '#050505', color: '#3ecf8e', padding: '16px', borderRadius: '10px', fontFamily: MONO, fontSize: '12.5px', lineHeight: '1.7', height: '440px', overflowY: 'auto', border: '1px solid rgba(62,207,142,0.1)', boxShadow: 'inset 0 2px 8px 0 rgba(0,0,0,0.6)' }}>
            {buildLogs.length === 0 ? (
              <div style={{ color: '#3f3f46', fontStyle: 'italic' }}>
                {activeDeploymentId ? '$ starting container process...' : '$ waiting for deployment trigger...'}
                <span style={{ animation: 'blink 1s step-start infinite' }}>▍</span>
              </div>
            ) : (
              buildLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: log.toLowerCase().includes('error') || log.includes('❌') ? '#f87171' : '#d4d4d8' }}>
                  <span style={{ color: '#3ecf8e', marginRight: '10px', userSelect: 'none', opacity: 0.6 }}>{(index + 1).toString().padStart(2, '0')}</span>
                  {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* ---------- 4. SETTINGS TAB ---------- */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }} className="vc-grid">
          <div style={cardShellStyle}>
            <h3 style={sectionLabelStyle}>Account</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3ecf8e', fontWeight: 700, fontSize: '14px', fontFamily: MONO }}>
                  {(githubUser || 'D').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fafafa' }}>{githubUser || 'Developer'}</div>
                  <div style={{ fontSize: '12px', color: '#52525b', fontFamily: MONO }}>connected via github</div>
                </div>
              </div>
              <button onClick={onDisconnect} style={{ fontFamily: MONO, fontSize: '12.5px', color: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
              ['Deployed projects', deployments.length],
              ['Active repositories', repos?.length || 0],
            ].map(([label, value]) => (
              <InfoRow key={label} label={label} value={value} />
            ))}
          </div>

          <div style={{ ...cardShellStyle, gridColumn: '1 / -1', border: '1px solid rgba(248,113,113,0.25)', backgroundColor: 'rgba(248,113,113,0.03)' }}>
            <h3 style={{ ...sectionLabelStyle, color: '#f87171' }}>Danger Zone</h3>
            <div style={{ ...rowBetween, flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ fontSize: '12.5px', color: '#a1a1aa', lineHeight: 1.6, margin: 0, maxWidth: '480px' }}>
                Permanently delete your VeloCore account, including all deployment records and stored GitHub credentials. This cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ fontFamily: MONO, fontSize: '12.5px', fontWeight: 600, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', padding: '9px 16px', borderRadius: '7px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPLOYMENT CONFIGURATION MODAL */}
      {showDeployModal && deployModalRepo && (
        <Modal maxWidth="560px">
          <h3 style={modalTitleStyle}>Deployment Configuration</h3>
          <label style={fieldLabelStyle}>Project Name</label>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ ...fieldInputStyle, marginBottom: '18px' }} />
          <span style={{ ...sectionLabelStyle, margin: '0 0 10px 0' }}>Environment Variables</span>
          <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
            <EnvVarTable rows={modalEnvRows} onChangeRow={(id, field, val) => updateRows(setModalEnvRows, id, field, val)} onAddRow={() => addRow(setModalEnvRows)} onRemoveRow={(id) => removeRowFrom(setModalEnvRows, id)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button onClick={() => setShowDeployModal(false)} disabled={deployingModal} style={modalCancelButtonStyle}>Cancel</button>
            <button onClick={handleConfirmDeploy} disabled={deployingModal} style={{ ...modalPrimaryButtonStyle, opacity: deployingModal ? 0.6 : 1, cursor: deployingModal ? 'not-allowed' : 'pointer' }}>
              {deployingModal ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </Modal>
      )}

      {/* FREE-TIER LIMIT REACHED POPUP */}
      {showLimitPopup && (
        <Modal maxWidth="380px" accent="rgba(250,204,21,0.35)">
          <h3 style={{ ...modalTitleStyle, color: '#facc15' }}>Free-tier limit reached</h3>
          <p style={modalSubtitleStyle}>
            You already have {activeCount} running deployment{activeCount === 1 ? '' : 's'}, and the free tier allows {FREE_TIER_LIMIT}. Stop or
            delete an existing deployment from the Deployed tab before creating a new one.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowLimitPopup(false)} style={modalPrimaryButtonStyle}>Got it</button>
          </div>
        </Modal>
      )}

      {/* DELETE ACCOUNT CONFIRM MODAL */}
      {showDeleteConfirm && (
        <Modal>
          <h3 style={modalTitleStyle}>Delete your account?</h3>
          <p style={modalSubtitleStyle}>This will permanently remove your account, deployment history, and GitHub token from VeloCore. This action cannot be undone.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => setShowDeleteConfirm(false)} disabled={deletingAccount} style={modalCancelButtonStyle}>Cancel</button>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount || !userId}
              style={{ ...modalPrimaryButtonStyle, backgroundColor: '#f87171', cursor: deletingAccount ? 'not-allowed' : 'pointer', opacity: deletingAccount ? 0.6 : 1 }}
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

export default Dashboard;