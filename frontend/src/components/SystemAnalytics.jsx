import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const COLORS = {
  bg: '#0a0a0a',
  panel: '#111111',
  panelAlt: '#0d0d0d',
  border: '#232323',
  borderSoft: '#1a1a1a',
  textPrimary: '#e6e6e6',
  textSecondary: '#8a8a8a',
  textMuted: '#5c5c5c',
  accent: '#3ecf8e',
  danger: '#ef4444',
  warning: '#f5a623',
};

const mono = "'JetBrains Mono', monospace";
const body = "'Inter', sans-serif";

export default function Analytics() {
  const [deployments, setDeployments] = useState([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
  const [metricsData, setMetricsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close the deployment dropdown when clicking outside it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch available deployments
  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const response = await axios.get(
          'http://localhost:8080/api/dashboard/analytics-list',
          { withCredentials: true }
        );

        const data = Array.isArray(response.data)
          ? response.data
          : response.data.deployments || [];

        setDeployments(data);

        if (data.length > 0) {
          setSelectedDeploymentId(data[0].id || data[0]._id);
        } else {
          setError('No deployments found. Deploy an application to view tracking metrics.');
        }
      } catch (err) {
        console.error('Deployment fetch error:', err);
        setError(`Failed to connect to deployments: ${err.response?.data?.error || err.message}`);
      }
    };

    fetchDeployments();
  }, []);

  // Fetch metrics for the selected deployment, polling every 5s
  useEffect(() => {
    if (!selectedDeploymentId) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:8080/api/analytics/history/${selectedDeploymentId}`,
          { withCredentials: true }
        );

        const metrics = Array.isArray(response.data)
          ? response.data
          : response.data.metrics || [];

        setMetricsData(metrics);
        setError('');
      } catch (err) {
        console.error('Metrics fetch error:', err);
        setError(`Could not retrieve data for this deployment: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, 5000);
    return () => clearInterval(timer);
  }, [selectedDeploymentId]);

  const latest = metricsData[metricsData.length - 1] || {};
  const selectedDeployment = deployments.find((d) => (d.id || d._id) === selectedDeploymentId);

  const statusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('fail') || s.includes('error')) return COLORS.danger;
    if (s.includes('build') || s.includes('pending') || s.includes('progress')) return COLORS.warning;
    return COLORS.accent;
  };

  const cardBase = {
    padding: '20px',
    borderRadius: '8px',
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    position: 'relative',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
  };

  const labelStyle = {
    fontSize: '11px',
    color: COLORS.textSecondary,
    fontFamily: mono,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  };

  const valueStyle = {
    margin: '10px 0 0',
    fontSize: '26px',
    fontWeight: 600,
    fontFamily: mono,
    color: COLORS.textPrimary,
  };

  const diagnosticRow = {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    padding: '14px 18px',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  return (
    <div
      style={{
        padding: '32px',
        fontFamily: body,
        color: COLORS.textPrimary,
        background: `
          radial-gradient(circle at 15% 0%, rgba(62, 207, 142, 0.06), transparent 40%),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 24px),
          ${COLORS.bg}
        `,
        minHeight: '100vh',
      }}
    >
      <style>{`
        @keyframes veloPulse {
          0% { box-shadow: 0 0 0 0 rgba(62, 207, 142, 0.55); }
          70% { box-shadow: 0 0 0 6px rgba(62, 207, 142, 0); }
          100% { box-shadow: 0 0 0 0 rgba(62, 207, 142, 0); }
        }
        @keyframes veloDropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .velo-metric-card:hover {
          border-color: rgba(62, 207, 142, 0.45) !important;
          box-shadow: 0 0 0 1px rgba(62, 207, 142, 0.15), 0 8px 24px rgba(0, 0, 0, 0.35);
          transform: translateY(-2px);
        }
        .velo-diag-row {
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .velo-diag-row:hover {
          border-color: rgba(62, 207, 142, 0.35);
          background: #131313;
        }
        .velo-live-dot {
          animation: veloPulse 1.8s infinite;
        }
        .velo-table-row {
          transition: background 0.15s ease;
        }
        .velo-table-row:hover {
          background: rgba(62, 207, 142, 0.04);
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <h2 style={{ margin: 0, fontFamily: mono, fontWeight: 600, fontSize: '20px', letterSpacing: '0.02em' }}>
          Systems Analytics
        </h2>
        {selectedDeploymentId && !error && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: mono, fontSize: '10px', color: COLORS.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span className="velo-live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.accent, display: 'inline-block' }} />
            live
          </span>
        )}
      </div>
      <p style={{ color: COLORS.textSecondary, marginTop: '8px', marginBottom: '28px', fontSize: '14px' }}>
        Real-time infrastructure telemetry for your active deployments.
      </p>

      {/* Deployment Selector */}
      <div
        style={{
          ...cardBase,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          padding: '14px 20px',
        }}
      >
        <span style={{ fontFamily: mono, fontSize: '12px', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Deployment
        </span>

        <div ref={dropdownRef} style={{ position: 'relative', minWidth: '300px' }}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '6px',
              border: `1px solid ${dropdownOpen ? COLORS.accent : COLORS.border}`,
              background: COLORS.panelAlt,
              color: COLORS.textPrimary,
              fontFamily: body,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: dropdownOpen ? '0 0 0 3px rgba(62, 207, 142, 0.12)' : 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {selectedDeployment ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: statusColor(selectedDeployment.status),
                    boxShadow: `0 0 6px ${statusColor(selectedDeployment.status)}`,
                  }}
                />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedDeployment.project_name || selectedDeployment.repo_name || `Deployment #${selectedDeployment.id || selectedDeployment._id}`}
                </span>
                <span style={{ fontFamily: mono, fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase' }}>
                  {selectedDeployment.status || 'Active'}
                </span>
              </span>
            ) : (
              <span style={{ color: COLORS.textMuted }}>-- Choose an app --</span>
            )}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              style={{
                flexShrink: 0,
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.18s ease',
              }}
            >
              <path d="M2 4 L6 8 L10 4" stroke={COLORS.accent} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 20,
                background: COLORS.panelAlt,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                boxShadow: '0 0 0 1px rgba(62, 207, 142, 0.08), 0 16px 40px rgba(0,0,0,0.55)',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '6px',
                animation: 'veloDropIn 0.14s ease',
              }}
            >
              {deployments.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '12px', color: COLORS.textMuted, fontFamily: mono }}>
                  No deployments available
                </div>
              ) : (
                deployments.map((deploy) => {
                  const id = deploy.id || deploy._id;
                  const isSelected = id === selectedDeploymentId;
                  return (
                    <div
                      key={id}
                      onClick={() => {
                        setSelectedDeploymentId(id);
                        setDropdownOpen(false);
                      }}
                      className="velo-diag-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '9px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'rgba(62, 207, 142, 0.35)' : 'transparent'}`,
                        background: isSelected ? 'rgba(62, 207, 142, 0.08)' : 'transparent',
                        marginBottom: '2px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: statusColor(deploy.status),
                          }}
                        />
                        <span style={{ fontSize: '13px', color: COLORS.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {deploy.project_name || deploy.repo_name || `Deployment #${id}`}
                        </span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontFamily: mono, fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase' }}>
                          {deploy.status || 'Active'}
                        </span>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M2.5 6.5 L5 9 L9.5 3.5" stroke={COLORS.accent} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {loading && (
          <span style={{ fontFamily: mono, fontSize: '11px', color: COLORS.accent }}>syncing…</span>
        )}
      </div>

      {error && (
        <div
          style={{
            color: COLORS.danger,
            background: 'rgba(239, 68, 68, 0.08)',
            border: `1px solid rgba(239, 68, 68, 0.3)`,
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '13px',
            fontFamily: mono,
          }}
        >
          {error}
        </div>
      )}

      {!selectedDeploymentId ? (
        <div style={{ ...cardBase, padding: '48px', textAlign: 'center', color: COLORS.textSecondary }}>
          Select a deployment above to view live analytics.
        </div>
      ) : loading && metricsData.length === 0 ? (
        <div style={{ ...cardBase, padding: '48px', textAlign: 'center', color: COLORS.textSecondary, fontFamily: mono }}>
          Loading telemetry…
        </div>
      ) : metricsData.length === 0 ? (
        <div style={{ ...cardBase, padding: '48px', textAlign: 'center', color: COLORS.textSecondary }}>
          No metrics recorded yet for this deployment. Check that the monitoring worker is running.
        </div>
      ) : (
        <div>
          {/* --- TOP 4 PRIMARY CARDS --- */}
          <h3 style={{ marginBottom: '14px', fontFamily: mono, fontSize: '13px', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Critical Resource Metrics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div className="velo-metric-card" style={{ ...cardBase, borderLeft: `3px solid ${COLORS.accent}` }}>
              <div style={labelStyle}>CPU Usage</div>
              <div style={valueStyle}>{latest.cpu_usage ?? 0}%</div>
            </div>
            <div className="velo-metric-card" style={{ ...cardBase, borderLeft: `3px solid ${COLORS.accent}` }}>
              <div style={labelStyle}>Memory Usage</div>
              <div style={valueStyle}>{latest.memory_usage ?? 0} MB</div>
            </div>
            <div className="velo-metric-card" style={{ ...cardBase, borderLeft: `3px solid ${COLORS.warning}` }}>
              <div style={labelStyle}>Request Volume</div>
              <div style={valueStyle}>{latest.request_count ?? 0}</div>
            </div>
            <div className="velo-metric-card" style={{ ...cardBase, borderLeft: `3px solid ${COLORS.danger}` }}>
              <div style={labelStyle}>Error Rate</div>
              <div style={{ ...valueStyle, color: (latest.error_rate ?? 0) > 0 ? COLORS.danger : COLORS.textPrimary }}>
                {latest.error_rate ?? 0}%
              </div>
            </div>
          </div>

          {/* --- FULL 10-METRIC DIAGNOSTICS GRID --- */}
          <h3 style={{ marginBottom: '14px', fontFamily: mono, fontSize: '13px', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Diagnostics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '32px' }}>
            <div className="velo-diag-row" style={diagnosticRow}>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Network In</span>
              <strong style={{ fontFamily: mono, color: COLORS.textPrimary }}>{latest.network_in ?? 0} KB/s</strong>
            </div>
            <div className="velo-diag-row" style={diagnosticRow}>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Network Out</span>
              <strong style={{ fontFamily: mono, color: COLORS.textPrimary }}>{latest.network_out ?? 0} KB/s</strong>
            </div>
            <div className="velo-diag-row" style={diagnosticRow}>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Disk I/O</span>
              <strong style={{ fontFamily: mono, color: COLORS.textPrimary }}>{latest.disk_io ?? 0} MB/s</strong>
            </div>
            <div className="velo-diag-row" style={diagnosticRow}>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Active Connections</span>
              <strong style={{ fontFamily: mono, color: COLORS.textPrimary }}>{latest.active_connections ?? 0}</strong>
            </div>
            <div className="velo-diag-row" style={diagnosticRow}>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>Latency</span>
              <strong style={{ fontFamily: mono, color: (latest.latency_ms ?? 0) > 200 ? COLORS.danger : COLORS.textPrimary }}>{latest.latency_ms ?? 0} ms</strong>
            </div>
          </div>

          {/* --- HISTORY LOG TABLE --- */}
          <div style={{ ...cardBase, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontFamily: mono, fontSize: '13px', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System History
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: mono }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, textAlign: 'left', color: COLORS.textSecondary }}>
                    <th style={{ padding: '10px', fontWeight: 500 }}>Timestamp</th>
                    <th style={{ padding: '10px', fontWeight: 500 }}>CPU</th>
                    <th style={{ padding: '10px', fontWeight: 500 }}>RAM</th>
                    <th style={{ padding: '10px', fontWeight: 500 }}>Requests</th>
                    <th style={{ padding: '10px', fontWeight: 500 }}>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {[...metricsData].reverse().slice(0, 8).map((m, i) => (
                    <tr key={m.id || m._id || i} className="velo-table-row" style={{ borderBottom: `1px solid ${COLORS.borderSoft}`, color: COLORS.textPrimary }}>
                      <td style={{ padding: '10px', color: COLORS.textSecondary }}>
                        {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : 'Polling'}
                      </td>
                      <td style={{ padding: '10px', color: COLORS.accent }}>{m.cpu_usage ?? 0}%</td>
                      <td style={{ padding: '10px' }}>{m.memory_usage ?? 0} MB</td>
                      <td style={{ padding: '10px' }}>{m.request_count ?? 0}</td>
                      <td style={{ padding: '10px', color: (m.latency_ms ?? 0) > 200 ? COLORS.danger : COLORS.textPrimary }}>
                        {m.latency_ms ?? 0}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}