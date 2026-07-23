import React, { useState, useEffect, useMemo } from "react";
import StatusBadge from "./StatusBadge";
import OverviewTab from "./OverviewTab";
import LogsTab from "./LogsTab";
import MonitoringTab from "./MonitoringTab";
import Modal from "./Modal";
import useDeploymentRuntime from "../hooks/useDeploymentRuntime";
import useEnvVars from "../hooks/useEnvVars";
import { REDEPLOY_BASE, ACTION_BASE, SOCKET_URL, MONO } from "../config";
import { getStatusStyle } from "../statusMeta";
import LokiLogsTab from "./LokiLogsTab";
const backBtnStyle = {
  fontFamily: MONO,
  fontSize: "12.5px",
  color: "#a1a1aa",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
const tabBtnStyle = (active) => ({
  padding: "7px 14px",
  borderRadius: "7px",
  border: "none",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: "12px",
  fontWeight: 600,
  color: active ? "#08090a" : "#a1a1aa",
  background: active ? "#3ecf8e" : "rgba(255,255,255,0.04)",
  whiteSpace: "nowrap",
});
const cardShellStyle = {
  backgroundColor: "rgba(255,255,255,0.025)",
  backdropFilter: "blur(12px)",
  padding: "20px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
};
const cancelBtnStyle = {
  fontFamily: MONO,
  fontSize: "12.5px",
  color: "#a1a1aa",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "9px 16px",
  borderRadius: "7px",
  cursor: "pointer",
};
const dangerBtnStyle = (busy) => ({
  fontFamily: MONO,
  fontSize: "12.5px",
  fontWeight: 600,
  color: "#08090a",
  backgroundColor: "#f87171",
  border: "none",
  padding: "9px 16px",
  borderRadius: "7px",
  cursor: busy ? "not-allowed" : "pointer",
  opacity: busy ? 0.6 : 1,
});
const mutedTextStyle = {
  color: "#52525b",
  fontSize: "13.5px",
  fontFamily: MONO,
};
const sectionLabelStyle = {
  fontSize: "11px",
  fontFamily: MONO,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#a1a1aa",
  fontWeight: 500,
  margin: "0 0 12px 0",
};

const timelineUrl = (id) => `${SOCKET_URL}/api/deployments/${id}/timeline`;

const eventsUrl = (id) => `${SOCKET_URL}/api/deployments/${id}/events`;
const rollbackUrl = (id) => `${SOCKET_URL}/api/rollback/${id}/rollback`;

// ── Timeline ────────────
const TIMELINE_STAGE_ORDER = [
  "workspace",
  "clone",
  "analysis",
  "build",
  "security",
  "deploy",
  "rollout",
  "running",
  "failed",
];
const TIMELINE_STAGE_LABELS = {
  deployment: "Deployment Started",
  workspace: "Workspace",
  clone: "Repository Clone",
  analysis: "Repository Analysis",
  security: "Security Scan",
  build: "Application Build",
  running: "Application Running",
  failed: "Deployment Failed",
};
const TIMELINE_STATUS_COLOR = {
  success: "#3ecf8e",
  running: "#38bdf8",
  failed: "#f87171",
  rollback: "#a78bfa",
  pending: "#3f3f46",
};

function StageIcon({ stage, color }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (stage) {
    case "workspace":
      return (
        <svg {...common}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "clone":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="12" r="2.5" />
          <path d="M6 8.5v7M8.3 17 15.7 13M15.7 11 8.3 7" />
        </svg>
      );
    case "analysis":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6.5" />
          <path d="M20 20l-5.5-5.5" />
        </svg>
      );
    case "build":
      return (
        <svg {...common}>
          <path d="M14.5 3.5l6 6-2.5 2.5M17 6l-9 9M6.5 15L3 20l5-3.5M8 17l-3-3" />
        </svg>
      );
    case "security":
      return (
        <svg {...common}>
          <path d="M12 2l8 3.5V11c0 5.5-3.5 9-8 11-4.5-2-8-5.5-8-11V5.5z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "deploy":
      return (
        <svg {...common}>
          <path d="M12 2v14M6 10l6-6 6 6M4 20h16" />
        </svg>
      );
    case "rollout":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <rect x="3" y="10" width="18" height="4" rx="1" />
          <rect x="3" y="16" width="18" height="4" rx="1" />
        </svg>
      );
    case "running":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 8.5v7l6-3.5z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      );
  }
}

function formatTimestamp(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function TimelineTab({ deploymentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(timelineUrl(deploymentId), {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.timeline || data.events || [];
        if (!cancelled) {
          setEvents(list);
          setError(null);
        }
      } catch (err) {
        console.error("[Timeline Fetch Error]:", err.message);
        if (!cancelled) setError("Failed to load deployment timeline.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deploymentId]);

  if (loading)
    return <p style={mutedTextStyle}>$ fetching deployment timeline...</p>;
  if (error)
    return <p style={{ ...mutedTextStyle, color: "#f87171" }}>$ {error}</p>;
  if (events.length === 0)
    return <p style={mutedTextStyle}>$ no timeline events reported yet.</p>;

  return (
    <div>
      <div style={sectionLabelStyle}>Deployment Timeline</div>
      <div style={{ position: "relative", paddingLeft: "30px" }}>
        {events.map((ev, i) => {
          const stage = String(ev.stage || ev.step || "")
            .trim()
            .toLowerCase();
          const stageLabel =
            TIMELINE_STAGE_LABELS[stage] ||
            ev.stage ||
            ev.step ||
            `Step ${i + 1}`;
          const evStatus = String(ev.status || "success").toLowerCase();
          const color =
            TIMELINE_STATUS_COLOR[evStatus] || TIMELINE_STATUS_COLOR.pending;
          const isLast = i === events.length - 1;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                paddingBottom: isLast ? 0 : "22px",
              }}
            >
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: "-19px",
                    top: "20px",
                    bottom: "-2px",
                    width: "2px",
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: "-30px",
                  top: 0,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `2px solid ${color}`,
                  background: "#08090a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    evStatus === "running" ? `0 0 0 3px ${color}22` : "none",
                }}
              >
                <StageIcon stage={stage} color={color} />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "#fafafa",
                    fontSize: "13.5px",
                  }}
                >
                  {stageLabel}
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontFamily: MONO,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color,
                    backgroundColor: `${color}1a`,
                    border: `1px solid ${color}59`,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                  }}
                >
                  {evStatus}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#52525b",
                  fontFamily: MONO,
                  marginTop: "2px",
                }}
              >
                {formatTimestamp(ev.timestamp || ev.time || ev.createdAt)}
              </div>
              {(ev.description || ev.message) && (
                <p
                  style={{
                    fontSize: "12.5px",
                    color: "#a1a1aa",
                    margin: "6px 0 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {ev.description || ev.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Events ────
const SEVERITY_COLOR = {
  critical: "#f87171",
  error: "#f87171",
  warning: "#facc15",
  warn: "#facc15",
  info: "#38bdf8",
  success: "#3ecf8e",
  debug: "#71717a",
};

function EventsTab({ deploymentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(eventsUrl(deploymentId), {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.events || [];
        if (!cancelled) {
          setEvents(list);
          setError(null);
        }
      } catch (err) {
        console.error("[Events Fetch Error]:", err.message);
        if (!cancelled) setError("Failed to load deployment events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deploymentId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) =>
      `${ev.message || ""} ${ev.severity || ""} ${ev.stage || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [events, query]);

  if (loading)
    return <p style={mutedTextStyle}>$ fetching deployment events...</p>;
  if (error)
    return <p style={{ ...mutedTextStyle, color: "#f87171" }}>$ {error}</p>;

  return (
    <div>
      <div style={sectionLabelStyle}>Deployment Events</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search events by message, severity, or stage..."
        style={{
          width: "100%",
          backgroundColor: "#050505",
          color: "#e4e4e7",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "9px 12px",
          fontFamily: MONO,
          fontSize: "12.5px",
          boxSizing: "border-box",
          marginBottom: "12px",
        }}
      />

      {filtered.length === 0 ? (
        <p style={mutedTextStyle}>$ no events match your search.</p>
      ) : (
        <div
          style={{
            maxHeight: "440px",
            overflowY: "auto",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12.5px",
            }}
          >
            <thead>
              <tr
                style={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: "#0c0d0e",
                  zIndex: 1,
                }}
              >
                {["Time", "Severity", "Message"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontFamily: MONO,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "#71717a",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev, i) => {
                const sev = (ev.severity || ev.level || "info").toLowerCase();
                const color = SEVERITY_COLOR[sev] || SEVERITY_COLOR.info;
                return (
                  <tr
                    key={i}
                    style={{
                      borderTop:
                        i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td
                      style={{
                        padding: "9px 12px",
                        fontFamily: MONO,
                        color: "#71717a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTimestamp(ev.timestamp || ev.time)}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: "10.5px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color,
                          backgroundColor: `${color}1a`,
                          border: `1px solid ${color}59`,
                          padding: "2px 8px",
                          borderRadius: "9999px",
                        }}
                      >
                        {sev}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", color: "#d4d4d8" }}>
                      {ev.message || ev.description || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Rollback ──
function RollbackTab({ deployment, onRollbackTriggered }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState(null);
  const statusStyle = getStatusStyle(deployment.status);

  const handleRollback = async () => {
    setRollingBack(true);
    setRollbackError(null);
    try {
      const res = await fetch(rollbackUrl(deployment.id), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setShowConfirm(false);
      onRollbackTriggered?.();
    } catch (err) {
      console.error("[Rollback Error]:", err.message);
      setRollbackError("Failed to trigger rollback. Please try again.");
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div>
      <div style={sectionLabelStyle}>Rollback</div>

      <div
        style={{
          ...cardShellStyle,
          border: "1px solid rgba(250,204,21,0.3)",
          backgroundColor: "rgba(250,204,21,0.03)",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#facc15"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4M12 17h.01M10.3 3.9L2.7 18a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <span
            style={{ fontWeight: 600, color: "#facc15", fontSize: "13.5px" }}
          >
            Rollback target
          </span>
        </div>
        <p
          style={{
            fontSize: "12.5px",
            color: "#a1a1aa",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Rolling back will revert{" "}
          <span style={{ color: "#fafafa" }}>{deployment.project_name}</span> to
          its last known stable release, restoring the previous build, image,
          and environment configuration. The deployment currently reports status{" "}
          <span style={{ color: statusStyle.fg, fontFamily: MONO }}>
            {deployment.status}
          </span>
          . This does not delete the current deployment record — it redeploys
          the prior version in its place.
        </p>
      </div>

      {rollbackError && (
        <p
          style={{ ...mutedTextStyle, color: "#f87171", marginBottom: "12px" }}
        >
          $ {rollbackError}
        </p>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        style={{
          fontFamily: MONO,
          fontSize: "12.5px",
          fontWeight: 700,
          color: "#08090a",
          backgroundColor: "#facc15",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Rollback to Previous Version
      </button>

      {showConfirm && (
        <Modal maxWidth="400px" accent="rgba(250,204,21,0.35)">
          <h3
            style={{
              margin: "0 0 10px 0",
              fontSize: "15px",
              color: "#facc15",
              fontWeight: 600,
            }}
          >
            Confirm rollback?
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "#a1a1aa",
              lineHeight: 1.6,
              margin: "0 0 18px 0",
            }}
          >
            This will redeploy the previous stable version of{" "}
            <span style={{ color: "#fafafa" }}>{deployment.project_name}</span>{" "}
            and replace the currently running version. This action starts
            immediately.
          </p>
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              onClick={() => setShowConfirm(false)}
              disabled={rollingBack}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
            <button
              onClick={handleRollback}
              disabled={rollingBack}
              style={{
                fontFamily: MONO,
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#08090a",
                backgroundColor: "#facc15",
                border: "none",
                padding: "9px 16px",
                borderRadius: "7px",
                cursor: rollingBack ? "not-allowed" : "pointer",
                opacity: rollingBack ? 0.6 : 1,
              }}
            >
              {rollingBack ? "Rolling back..." : "Rollback"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Deployment Details ──────
export default function DeploymentDetails({
  deployment,
  onBack,
  onDeleted,
  onRefreshDeployments,
  onGoToLogs,
}) {
  const [tab, setTab] = useState("overview");
  const [actionInProgress, setActionInProgress] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { services, servicesLoading, servicesError, runtimeEngine, metrics } =
    useDeploymentRuntime(deployment.id, {
      poll: tab === "overview" || tab === "monitoring",
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
  } = useEnvVars(deployment.id, { autoLoad: tab === "overview" });

  const handleRedeploy = async () => {
    setActionInProgress("redeploy");
    try {
      const rows = await ensureLoaded();
      await saveEnv(rows);
      const res = await fetch(`${REDEPLOY_BASE}/${deployment.id}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }

      let data = {};

      const text = await res.text();

      if (text.length) {
        data = JSON.parse(text);
      }
      await onRefreshDeployments();

      if (onGoToLogs) {
        onGoToLogs(data.deploymentId);
      }
    } catch (err) {
      console.error("[Redeploy Error]:", err.message);
      alert("Failed to trigger redeployment.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRuntimeAction = async (action) => {
    setActionInProgress(action);
    try {
      const res = await fetch(`${ACTION_BASE}/${deployment.id}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || `Server responded ${res.status}`);
      }

      await res.json(); // consume the response
      await onRefreshDeployments();
    } catch (err) {
      console.error(`[Runtime Action: ${action}] Error:`, err.message);
      alert(`Failed to ${action} this deployment.`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    setActionInProgress("delete");
    try {
      await onDeleted(deployment.id);
      setShowDeleteConfirm(false);
      onBack();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRollbackTriggered = async () => {
    await onRefreshDeployments();
    setTab("overview");
  };

  return (
    <div style={cardShellStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <button onClick={onBack} style={backBtnStyle}>
          ← Back to Deployed Projects
        </button>
        <StatusBadge status={deployment.status} />
      </div>

      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: "18px",
          color: "#fafafa",
          fontWeight: 600,
        }}
      >
        {deployment.project_name}
      </h3>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setTab("overview")}
          style={tabBtnStyle(tab === "overview")}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("logs")}
          style={tabBtnStyle(tab === "logs")}
        >
          Logs
        </button>
        <button
          onClick={() => setTab("monitoring")}
          style={tabBtnStyle(tab === "monitoring")}
        >
          Monitoring
        </button>
        <button
          onClick={() => setTab("timeline")}
          style={tabBtnStyle(tab === "timeline")}
        >
          Timeline
        </button>
        <button
          onClick={() => setTab("events")}
          style={tabBtnStyle(tab === "events")}
        >
          Events
        </button>
        <button
          onClick={() => setTab("rollback")}
          style={tabBtnStyle(tab === "rollback")}
        >
          Rollback
        </button>
      </div>

      {tab === "overview" && (
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
          onRestart={() => handleRuntimeAction("restart")}
          onStop={() => handleRuntimeAction("stop")}
          onDeleteClick={() => setShowDeleteConfirm(true)}
          actionInProgress={actionInProgress}
        />
      )}
      {tab === "logs" && <LokiLogsTab deploymentId={deployment.id} />}

      {tab === "monitoring" && <MonitoringTab metrics={metrics} />}

      {tab === "timeline" && <TimelineTab deploymentId={deployment.id} />}

      {tab === "events" && <EventsTab deploymentId={deployment.id} />}

      {tab === "rollback" && (
        <RollbackTab
          deployment={deployment}
          onRollbackTriggered={handleRollbackTriggered}
        />
      )}

      {showDeleteConfirm && (
        <Modal maxWidth="380px" accent="rgba(248,113,113,0.35)">
          <h3
            style={{
              margin: "0 0 10px 0",
              fontSize: "15px",
              color: "#f87171",
              fontWeight: 600,
            }}
          >
            Delete this deployment?
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "#a1a1aa",
              lineHeight: 1.6,
              margin: "0 0 18px 0",
            }}
          >
            This permanently removes{" "}
            <span style={{ color: "#fafafa" }}>{deployment.project_name}</span>{" "}
            and its deployment history. This cannot be undone.
          </p>
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={actionInProgress === "delete"}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirmed}
              disabled={actionInProgress === "delete"}
              style={dangerBtnStyle(actionInProgress === "delete")}
            >
              {actionInProgress === "delete" ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
