import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import SystemAnalytics from "../components/SystemAnalytics";

const AUTH_BASE = "http://localhost:8080/api/auth";
const DASH_BASE = "http://localhost:8080/api/dashboard";
const ENV_BASE = "http://localhost:8080/api/env";
const RUNTIME_BASE = "http://localhost:8080/api/deployments";
const REDEPLOY_BASE = "http://localhost:8080/api/deploy/redeploy";
const FREE_TIER_LIMIT = 2;

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_ENV_ROWS = () => [
  { id: genId(), key: "VITE_API_URL", value: "" },
  { id: genId(), key: "VITE_SUPABASE_URL", value: "" },
  { id: genId(), key: "PORT", value: "8080" },
  { id: genId(), key: "DATABASE_URL", value: "" },
  { id: genId(), key: "JWT_SECRET", value: "" },
];

const objectToRows = (obj) =>
  Object.entries(obj || {}).map(([key, value]) => ({
    id: genId(),
    key,
    value: String(value),
  }));
const rowsToObject = (rows) =>
  rows.reduce((acc, r) => {
    if (r.key.trim()) acc[r.key.trim()] = r.value;
    return acc;
  }, {});

const updateRows = (setRows, id, field, value) =>
  setRows((prev) =>
    prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
  );
const addRow = (setRows) =>
  setRows((prev) => [...prev, { id: genId(), key: "", value: "" }]);
const removeRowFrom = (setRows, id) =>
  setRows((prev) => prev.filter((r) => r.id !== id));

const TABS = [
  {
    key: "deployed",
    label: "Deployed",
    icon: (color) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    ),
  },
  {
    key: "repos",
    label: "Repos",
    icon: (color) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "logs",
    label: "Live Logs",
    icon: (color) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: (color) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    icon: (color) => (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

// Single source of truth for every deployment status this app can show.
const STATUS_META = {
  QUEUED: {
    fg: "#a1a1aa",
    bg: "rgba(161,161,170,0.12)",
    border: "rgba(161,161,170,0.3)",
    busy: true,
  },
  CLONING: {
    fg: "#38bdf8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.35)",
    busy: true,
  },
  SCANNING: {
    fg: "#38bdf8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.35)",
    busy: true,
  },
  BUILDING: {
    fg: "#facc15",
    bg: "rgba(250,204,21,0.12)",
    border: "rgba(250,204,21,0.35)",
    busy: true,
  },
  DEPLOYING: {
    fg: "#facc15",
    bg: "rgba(250,204,21,0.12)",
    border: "rgba(250,204,21,0.35)",
    busy: true,
  },
  RUNNING: {
    fg: "#3ecf8e",
    bg: "rgba(62,207,142,0.12)",
    border: "rgba(62,207,142,0.4)",
    busy: false,
  },
  FAILED: {
    fg: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.4)",
    busy: false,
    terminal: true,
  },
  STOPPED: {
    fg: "#6b7280",
    bg: "rgba(107,114,128,0.12)",
    border: "rgba(107,114,128,0.3)",
    busy: false,
    terminal: true,
  },
  IDLE: {
    fg: "#6b7280",
    bg: "rgba(107,114,128,0.12)",
    border: "rgba(107,114,128,0.3)",
    busy: false,
  },
};
const getStatusStyle = (status) => STATUS_META[status] || STATUS_META.IDLE;

const cardShellStyle = {
  backgroundColor: "rgba(255,255,255,0.025)",
  backdropFilter: "blur(12px)",
  padding: "20px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  minWidth: 0,
};

const sectionLabelStyle = {
  margin: "0 0 16px 0",
  fontSize: "13px",
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#a1a1aa",
  fontWeight: 500,
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: "20px",
};

const modalBoxStyle = {
  backgroundColor: "#0c0d0e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  padding: "24px",
  maxWidth: "440px",
  width: "100%",
};

const modalTitleStyle = {
  margin: "0 0 10px 0",
  fontSize: "15px",
  color: "#fafafa",
  fontWeight: 600,
};
const modalSubtitleStyle = {
  fontSize: "13px",
  color: "#a1a1aa",
  lineHeight: 1.6,
  margin: "0 0 18px 0",
};

const modalCancelButtonStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12.5px",
  color: "#a1a1aa",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "9px 16px",
  borderRadius: "7px",
  cursor: "pointer",
};

const modalPrimaryButtonStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12.5px",
  fontWeight: 600,
  color: "#08090a",
  backgroundColor: "#3ecf8e",
  border: "none",
  padding: "9px 16px",
  borderRadius: "7px",
  cursor: "pointer",
};

const fieldLabelStyle = {
  display: "block",
  fontSize: "11px",
  fontFamily: "'JetBrains Mono', monospace",
  color: "#71717a",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "6px",
};

const fieldInputStyle = {
  width: "100%",
  backgroundColor: "#050505",
  color: "#e4e4e7",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "13px",
  boxSizing: "border-box",
};

const envInputStyle = (disabled) => ({
  width: "100%",
  backgroundColor: disabled ? "rgba(255,255,255,0.02)" : "#050505",
  color: disabled ? "#52525b" : "#d4d4d8",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  padding: "7px 10px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12.5px",
  boxSizing: "border-box",
  cursor: disabled ? "not-allowed" : "text",
});

const envAddButtonStyle = {
  width: "100%",
  padding: "9px",
  marginTop: "4px",
  borderRadius: "7px",
  border: "1px dashed rgba(62,207,142,0.35)",
  backgroundColor: "transparent",
  color: "#3ecf8e",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12.5px",
  fontWeight: 600,
  cursor: "pointer",
};

const subTabButtonStyle = (isActive) => ({
  padding: "7px 14px",
  borderRadius: "7px",
  border: "none",
  cursor: "pointer",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12px",
  fontWeight: 600,
  color: isActive ? "#08090a" : "#a1a1aa",
  background: isActive ? "#3ecf8e" : "rgba(255,255,255,0.04)",
});

const backButtonStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12.5px",
  color: "#a1a1aa",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

const FRAMEWORK_LABELS = {
  express: "Express",
  fastify: "Fastify",
  "vite-react": "Vite React",
  nextjs: "Next.js",
  bullmq: "BullMQ",
  django: "Django",
  flask: "Flask",
};
const formatFramework = (fw) =>
  FRAMEWORK_LABELS[fw] ||
  (fw
    ? fw.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unknown");

// One row per service returned by the runtime endpoint. Services without a URL
// (e.g. background workers) simply skip the Open/Copy buttons.
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
      console.error("[Clipboard Error]:", err.message);
    }
  };

  return (
    <div
      style={{
        padding: "16px 0",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          gap: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: style.fg,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 600,
              color: "#fafafa",
              fontSize: "14px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {service.name.charAt(0).toUpperCase() + service.name.slice(1)}
          </span>
        </div>
        <span
          style={{
            fontSize: "10.5px",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            textTransform: "uppercase",
            backgroundColor: style.bg,
            color: style.fg,
            border: `1px solid ${style.border}`,
            padding: "2px 8px",
            borderRadius: "9999px",
            whiteSpace: "nowrap",
          }}
        >
          {service.status}
        </span>
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "#71717a",
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: hasUrl ? "4px" : "10px",
        }}
      >
        {formatFramework(service.framework)}
      </div>

      {hasUrl && (
        <div
          style={{
            fontSize: "12.5px",
            color: "#3ecf8e",
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: "10px",
            wordBreak: "break-all",
          }}
        >
          {service.url}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {hasUrl && (
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...modalCancelButtonStyle,
              textDecoration: "none",
              padding: "6px 12px",
              fontSize: "11.5px",
              display: "inline-block",
            }}
          >
            Open
          </a>
        )}
        {hasUrl && (
          <button
            onClick={handleCopy}
            style={{
              ...modalCancelButtonStyle,
              padding: "6px 12px",
              fontSize: "11.5px",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
        <button
          onClick={() => alert("Service-level logs are coming soon.")}
          style={{
            ...modalCancelButtonStyle,
            padding: "6px 12px",
            fontSize: "11.5px",
          }}
        >
          Logs
        </button>
      </div>
    </div>
  );
}
function Modal({ maxWidth = "440px", accent, children }) {
  return (
    <div style={modalOverlayStyle}>
      <div
        style={{
          ...modalBoxStyle,
          maxWidth,
          ...(accent ? { border: `1px solid ${accent}` } : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Shared KEY/VALUE table used by both the deploy modal and the details "Environment Variables" tab.
function EnvVarTable({
  rows,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  readOnly = false,
  masked = false,
}) {
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: readOnly ? "1fr 1fr" : "1fr 1fr 28px",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <span style={{ ...sectionLabelStyle, margin: 0, fontSize: "11px" }}>
          Key
        </span>
        <span style={{ ...sectionLabelStyle, margin: 0, fontSize: "11px" }}>
          Value
        </span>
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: readOnly ? "1fr 1fr" : "1fr 1fr 28px",
            gap: "8px",
            marginBottom: "8px",
            alignItems: "center",
          }}
        >
          <input
            value={row.key}
            onChange={(e) => onChangeRow(row.id, "key", e.target.value)}
            placeholder="KEY"
            disabled={readOnly}
            style={envInputStyle(readOnly)}
          />
          <input
            value={masked ? "••••••••" : row.value}
            onChange={(e) => onChangeRow(row.id, "value", e.target.value)}
            placeholder="VALUE"
            disabled={readOnly}
            style={envInputStyle(readOnly)}
          />
          {!readOnly && (
            <button
              onClick={() => onRemoveRow(row.id)}
              style={{
                background: "none",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                fontSize: "14px",
              }}
              aria-label="Remove variable"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button onClick={onAddRow} style={envAddButtonStyle}>
          + Add Variable
        </button>
      )}
    </div>
  );
}

function Dashboard({
  githubUser,
  repos,
  onDeploy,
  loadingRepos,
  onDisconnect,
}) {
  const [activeTab, setActiveTab] = useState("deployed");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/session`, {
          credentials: "include",
        });
        if (res.ok) setUserId((await res.json()).userId);
      } catch (err) {
        console.error("[Session Fetch Error]:", err.message);
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
      const res = await fetch(`${DASH_BASE}/analytics-list`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setDeployments(await res.json());
      setDeploymentsError(null);
    } catch (err) {
      console.error("[Deployments Fetch Error]:", err.message);
      setDeploymentsError("Failed to load deployed projects.");
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
      const res = await fetch(`${DASH_BASE}/deployment/${deploymentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setDeployments((prev) => prev.filter((d) => d.id !== deploymentId));
    } catch (err) {
      console.error("[Delete Deployment Error]:", err.message);
      alert("Failed to delete this application. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- LIVE LOGS (build logs -> runtime logs, same stream) ----------
  const [activeDeploymentId, setActiveDeploymentId] = useState(null);
  const [buildLogs, setBuildLogs] = useState([]);
  const [buildStatus, setBuildStatus] = useState("IDLE");
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [buildLogs]);

  useEffect(() => {
    if (!activeDeploymentId) return;
    const socket = io("http://localhost:8080", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () =>
      socket.emit("join-deployment-stream", activeDeploymentId),
    );

    socket.on("live_logs", (payload) => {
      const text =
        typeof payload === "object" && payload !== null
          ? payload.text
          : payload;
      if (text) setBuildLogs((prev) => [...prev, text]);
    });

    socket.on("status_update", (data) => {
      setBuildStatus(data.status);
      fetchDeployments();
      if (STATUS_META[data.status]?.terminal) socket.disconnect();
    });

    return () => socket.disconnect();
  }, [activeDeploymentId, fetchDeployments]);

  const goToLogs = (deploymentId) => {
    setBuildLogs([]);
    setBuildStatus("QUEUED");
    setActiveDeploymentId(deploymentId);
    setActiveTab("logs");
  };

  const isBusy = getStatusStyle(buildStatus).busy;
  const statusStyle = getStatusStyle(buildStatus);
  const activeCount = deployments.filter((d) => d.status === "RUNNING").length;

  // ---------- DEPLOY MODAL (project name + env vars) ----------
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [deployModalRepo, setDeployModalRepo] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [modalEnvRows, setModalEnvRows] = useState([]);
  const [deployingModal, setDeployingModal] = useState(false);

  const handleDeployClick = (repo) => {
    if (activeCount >= FREE_TIER_LIMIT) {
      setShowLimitPopup(true);
      return;
    }
    setDeployModalRepo(repo);
    setProjectName(repo.name);
    setModalEnvRows(DEFAULT_ENV_ROWS());
    setShowDeployModal(true);
  };

  const handleConfirmDeploy = async () => {
    if (!deployModalRepo) return;
    setDeployingModal(true);
    try {
      const buildData = await onDeploy(
        deployModalRepo.name,
        deployModalRepo.clone_url,
        projectName,
      );
      if (!buildData?.deploymentId)
        throw new Error("Backend did not return a valid deploymentId.");

      await fetch(`${ENV_BASE}/${buildData.deploymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rowsToObject(modalEnvRows)),
      });
      setShowDeployModal(false);

      await fetchDeployments();

      goToLogs(buildData.deploymentId);
    } catch (err) {
      console.error("[Deploy Error]:", err.message);
      alert(`Failed to start deployment: ${err.message}`);
    } finally {
      setDeployingModal(false);
    }
  };

  // ---------- DEPLOYMENT DETAILS (Overview + Environment Variables) ----------
  const [viewingDeployment, setViewingDeployment] = useState(null);
  const [detailsSubTab, setDetailsSubTab] = useState("services");
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(null);
  const [envRows, setEnvRows] = useState([]);
  const [envOriginalRows, setEnvOriginalRows] = useState([]);
  const [envLoading, setEnvLoading] = useState(false);
  const [envEditing, setEnvEditing] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);

  const openDetails = (dep) => {
    setViewingDeployment(dep);
    setDetailsSubTab("services");
    setEnvEditing(false);
  };

  const closeDetails = () => {
    setViewingDeployment(null);
    setServices([]);
    setServicesError(null);
  };

  // Poll the runtime endpoint while the details page is open so status/URLs stay live.
  useEffect(() => {
    const deploymentId = viewingDeployment?.id;
    if (!deploymentId) return;
    let cancelled = false;

    const loadServices = async () => {
      try {
        const res = await fetch(`${RUNTIME_BASE}/${deploymentId}/runtime`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setServices(data.services || []);
          setServicesError(null);
        }
      } catch (err) {
        console.error("[Runtime Fetch Error]:", err.message);
        if (!cancelled) {
          setServicesError("Failed to load services.");
          setServices([]);
        }
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    };

    setServicesLoading(true);
    loadServices();
    const interval = setInterval(loadServices, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [viewingDeployment?.id]);

  useEffect(() => {
    if (!viewingDeployment || detailsSubTab !== "env") return;
    (async () => {
      setEnvLoading(true);
      try {
        const res = await fetch(`${ENV_BASE}/${viewingDeployment.id}`, {
          credentials: "include",
        });
        const data = res.ok ? await res.json() : {};
        const rows = objectToRows(data);
        setEnvRows(rows);
        setEnvOriginalRows(rows);
      } catch (err) {
        console.error("[Env Fetch Error]:", err.message);
        setEnvRows([]);
        setEnvOriginalRows([]);
      } finally {
        setEnvLoading(false);
      }
    })();
  }, [viewingDeployment, detailsSubTab]);

  const handleSaveEnv = async () => {
    if (!viewingDeployment) return;
    setEnvSaving(true);
    try {
      await fetch(`${ENV_BASE}/${viewingDeployment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rowsToObject(envRows)),
      });
      setEnvOriginalRows(envRows);
      setEnvEditing(false);
    } catch (err) {
      console.error("[Env Save Error]:", err.message);
      alert("Failed to save environment variables.");
    } finally {
      setEnvSaving(false);
    }
  };

  const handleRedeploy = async () => {
    if (!viewingDeployment) return;
    setEnvSaving(true);
    try {
      await fetch(`${ENV_BASE}/${viewingDeployment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(rowsToObject(envRows)),
      });
      const res = await fetch(`${REDEPLOY_BASE}/${viewingDeployment.id}`, {
        method: "POST",
        credentials: "include",
      });
      const data = res.ok ? await res.json() : {};

      setEnvOriginalRows(envRows);
      setEnvEditing(false);
      setViewingDeployment(null);
      goToLogs(data.deploymentId || viewingDeployment.id);
    } catch (err) {
      console.error("[Redeploy Error]:", err.message);
      alert("Failed to trigger redeployment.");
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
      const res = await fetch(`${DASH_BASE}/purge-account/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      onDisconnect();
    } catch (err) {
      console.error("[Delete Account Error]:", err.message);
      alert("Failed to delete your account. Please try again.");
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        width: "100%",
        backgroundColor: "#08090a",
        backgroundImage:
          "radial-gradient(circle at 15% 0%, rgba(62,207,142,0.06) 0%, transparent 45%), radial-gradient(circle at 85% 100%, rgba(62,207,142,0.04) 0%, transparent 40%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#e4e4e7",
        padding: "32px clamp(16px, 4vw, 48px)",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          paddingBottom: "20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "#3ecf8e",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            velocore // dashboard
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 600,
              color: "#fafafa",
            }}
          >
            Welcome,{" "}
            <span style={{ color: "#3ecf8e" }}>
              {githubUser || "Developer"}
            </span>
          </h2>
          <p
            style={{
              margin: "4px 0 0 0",
              color: "#71717a",
              fontSize: "13.5px",
            }}
          >
            Manage and deploy your projects in real-time.
          </p>
        </div>

        <button
          onClick={onDisconnect}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            color: "#a1a1aa",
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "9px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.borderColor = "rgba(248,113,113,0.4)";
            e.currentTarget.style.backgroundColor = "rgba(248,113,113,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#a1a1aa";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
          }}
        >
          <span style={{ fontSize: "14px" }}>⏻</span> logout
        </button>
      </header>

      {/* TAB BAR */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          padding: "5px",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const showBusyDot = tab.key === "logs" && isBusy;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12.5px",
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: isActive ? "#08090a" : "#a1a1aa",
                background: isActive ? "#3ecf8e" : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              {tab.icon(isActive ? "#08090a" : "#71717a")}
              {tab.label}
              {showBusyDot && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isActive ? "#08090a" : "#facc15",
                    animation: "dashPulse 1.2s ease-in-out infinite",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ---------- 1. DEPLOYED PROJECTS TAB ---------- */}
      {activeTab === "deployed" && viewingDeployment && (
        <div style={cardShellStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <button onClick={closeDetails} style={backButtonStyle}>
              ← Back to Deployed Projects
            </button>
            {(() => {
              const s = getStatusStyle(viewingDeployment.status);
              return (
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    backgroundColor: s.bg,
                    color: s.fg,
                    border: `1px solid ${s.border}`,
                    padding: "3px 9px",
                    borderRadius: "9999px",
                  }}
                >
                  {viewingDeployment.status}
                </span>
              );
            })()}
          </div>

          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "18px",
              color: "#fafafa",
              fontWeight: 600,
            }}
          >
            {viewingDeployment.project_name}
          </h3>

          <div style={{ display: "flex", gap: "8px", margin: "20px 0" }}>
            <button
              onClick={() => setDetailsSubTab("services")}
              style={subTabButtonStyle(detailsSubTab === "services")}
            >
              Services
            </button>
            <button
              onClick={() => setDetailsSubTab("overview")}
              style={subTabButtonStyle(detailsSubTab === "overview")}
            >
              Overview
            </button>
            <button
              onClick={() => setDetailsSubTab("env")}
              style={subTabButtonStyle(detailsSubTab === "env")}
            >
              Environment Variables
            </button>
          </div>

          {detailsSubTab === "services" && (
            <div>
              <h4 style={{ ...sectionLabelStyle, margin: "0 0 4px 0" }}>
                Deployment Services
              </h4>
              {servicesLoading ? (
                <p
                  style={{
                    color: "#52525b",
                    fontSize: "13px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  $ fetching runtime services...
                </p>
              ) : servicesError ? (
                <p
                  style={{
                    color: "#f87171",
                    fontSize: "13px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  $ {servicesError}
                </p>
              ) : services.length === 0 ? (
                <p
                  style={{
                    color: "#52525b",
                    fontSize: "13px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  $ no services reported for this deployment yet.
                </p>
              ) : (
                <div>
                  {services.map((service, i) => (
                    <ServiceRow
                      key={`${service.name}-${i}`}
                      service={service}
                      isLast={i === services.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {detailsSubTab === "overview" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px",
                color: "#a1a1aa",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#52525b" }}>Repository</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#e4e4e7",
                  }}
                >
                  {viewingDeployment.repo_name}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#52525b" }}>Deployed at</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#e4e4e7",
                  }}
                >
                  {viewingDeployment.created_at
                    ? new Date(viewingDeployment.created_at).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
          )}

          {detailsSubTab === "env" && (
            <div>
              {envLoading ? (
                <p
                  style={{
                    color: "#52525b",
                    fontSize: "13px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  $ loading environment variables...
                </p>
              ) : (
                <>
                  <EnvVarTable
                    rows={envRows}
                    readOnly={!envEditing}
                    masked={!envEditing}
                    onChangeRow={(id, field, val) =>
                      updateRows(setEnvRows, id, field, val)
                    }
                    onAddRow={() => addRow(setEnvRows)}
                    onRemoveRow={(id) => removeRowFrom(setEnvRows, id)}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "10px",
                      marginTop: "16px",
                    }}
                  >
                    {envEditing && (
                      <button
                        onClick={() => {
                          setEnvRows(envOriginalRows);
                          setEnvEditing(false);
                        }}
                        disabled={envSaving}
                        style={modalCancelButtonStyle}
                      >
                        Cancel
                      </button>
                    )}
                    {!envEditing && (
                      <button
                        onClick={() => setEnvEditing(true)}
                        style={modalCancelButtonStyle}
                      >
                        Edit
                      </button>
                    )}
                    {envEditing && (
                      <button
                        onClick={handleSaveEnv}
                        disabled={envSaving}
                        style={{
                          ...modalPrimaryButtonStyle,
                          opacity: envSaving ? 0.6 : 1,
                        }}
                      >
                        {envSaving ? "Saving..." : "Save"}
                      </button>
                    )}
                    <button
                      onClick={handleRedeploy}
                      disabled={envSaving}
                      style={{
                        ...modalPrimaryButtonStyle,
                        backgroundColor: "#38bdf8",
                        opacity: envSaving ? 0.6 : 1,
                      }}
                    >
                      {envSaving ? "Working..." : "Redeploy"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "deployed" && !viewingDeployment && (
        <div style={cardShellStyle}>
          <h3 style={sectionLabelStyle}>
            Deployed Projects{" "}
            <span style={{ color: "#3ecf8e" }}>({deployments.length})</span>
          </h3>

          {loadingDeployments ? (
            <p
              style={{
                color: "#52525b",
                fontSize: "13.5px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              $ fetching deployment records from database...
            </p>
          ) : deploymentsError ? (
            <p
              style={{
                color: "#f87171",
                fontSize: "13.5px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              $ {deploymentsError}
            </p>
          ) : deployments.length === 0 ? (
            <p
              style={{
                color: "#52525b",
                fontSize: "13.5px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              $ no deployments yet — deploy a repo from the Repos tab.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "10px",
              }}
            >
              {deployments.map((dep) => {
                const style = getStatusStyle(dep.status);
                return (
                  <div
                    key={dep.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.06)",
                      backgroundColor: "rgba(255,255,255,0.02)",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#fafafa",
                          fontSize: "14px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dep.project_name}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          backgroundColor: style.bg,
                          color: style.fg,
                          border: `1px solid ${style.border}`,
                          padding: "3px 9px",
                          borderRadius: "9999px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dep.status}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "#52525b",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      view Details for live service URLs →
                    </span>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#52525b",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {dep.created_at
                          ? new Date(dep.created_at).toLocaleString()
                          : ""}
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => openDetails(dep)}
                          style={{
                            ...modalCancelButtonStyle,
                            padding: "6px 12px",
                            fontSize: "11.5px",
                          }}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleDeleteDeployment(dep.id)}
                          disabled={deletingId === dep.id}
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "11.5px",
                            color: "#f87171",
                            backgroundColor: "rgba(248,113,113,0.08)",
                            border: "1px solid rgba(248,113,113,0.3)",
                            padding: "6px 12px",
                            borderRadius: "7px",
                            cursor:
                              deletingId === dep.id ? "not-allowed" : "pointer",
                            opacity: deletingId === dep.id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === dep.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- 2. REPOS TAB ---------- */}
      {activeTab === "repos" && (
        <div style={cardShellStyle}>
          <h3 style={sectionLabelStyle}>
            Repositories{" "}
            <span style={{ color: "#3ecf8e" }}>({repos?.length || 0})</span>
          </h3>

          {loadingRepos ? (
            <p
              style={{
                color: "#52525b",
                fontSize: "13.5px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              $ fetching repositories from github...
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "10px",
              }}
            >
              {repos?.map((repo) => (
                <div
                  key={repo.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      overflow: "hidden",
                      marginRight: "12px",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontWeight: 600,
                        color: "#fafafa",
                        fontSize: "14px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {repo.name}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "#52525b",
                        fontFamily: "'JetBrains Mono', monospace",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {repo.clone_url}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeployClick(repo)}
                    disabled={isBusy}
                    style={{
                      backgroundColor: isBusy
                        ? "rgba(62,207,142,0.15)"
                        : "#3ecf8e",
                      color: isBusy ? "#3ecf8e" : "#08090a",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: isBusy ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    Deploy
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- 3. LIVE LOGS TAB ---------- */}
      {activeTab === "logs" && (
        <div
          style={{
            ...cardShellStyle,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ ...sectionLabelStyle, margin: 0 }}>
              Build & Runtime Logs
            </h3>
            <span
              style={{
                fontSize: "11.5px",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                backgroundColor: statusStyle.bg,
                color: statusStyle.fg,
                border: `1px solid ${statusStyle.border}`,
                padding: "4px 10px",
                borderRadius: "9999px",
              }}
            >
              {buildStatus}
            </span>
          </div>

          <div
            style={{
              backgroundColor: "#050505",
              color: "#3ecf8e",
              padding: "16px",
              borderRadius: "10px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12.5px",
              lineHeight: "1.7",
              height: "440px",
              overflowY: "auto",
              border: "1px solid rgba(62,207,142,0.1)",
              boxShadow: "inset 0 2px 8px 0 rgba(0,0,0,0.6)",
            }}
          >
            {buildLogs.length === 0 ? (
              <div style={{ color: "#3f3f46", fontStyle: "italic" }}>
                {activeDeploymentId
                  ? "$ starting container process..."
                  : "$ waiting for deployment trigger..."}
                <span style={{ animation: "blink 1s step-start infinite" }}>
                  ▍
                </span>
              </div>
            ) : (
              buildLogs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "4px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color:
                      log.toLowerCase().includes("error") || log.includes("❌")
                        ? "#f87171"
                        : "#d4d4d8",
                  }}
                >
                  <span
                    style={{
                      color: "#3ecf8e",
                      marginRight: "10px",
                      userSelect: "none",
                      opacity: 0.6,
                    }}
                  >
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* ---------- 4. ANALYTICS TAB ---------- */}
      {activeTab === "analytics" && (
        <SystemAnalytics githubUser={githubUser} repos={repos} />
      )}

      {/* ---------- 5. SETTINGS TAB ---------- */}
      {activeTab === "settings" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "24px",
          }}
          className="vc-grid"
        >
          <div style={cardShellStyle}>
            <h3 style={sectionLabelStyle}>Account</h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.06)",
                backgroundColor: "rgba(255,255,255,0.02)",
                marginBottom: "12px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "rgba(62,207,142,0.12)",
                    border: "1px solid rgba(62,207,142,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3ecf8e",
                    fontWeight: 700,
                    fontSize: "14px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {(githubUser || "D").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#fafafa",
                    }}
                  >
                    {githubUser || "Developer"}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#52525b",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    connected via github
                  </div>
                </div>
              </div>
              <button
                onClick={onDisconnect}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12.5px",
                  color: "#f87171",
                  backgroundColor: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  padding: "8px 14px",
                  borderRadius: "7px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Disconnect
              </button>
            </div>
            <p
              style={{
                fontSize: "12.5px",
                color: "#52525b",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Disconnecting revokes VeloCore's read-only access to your GitHub
              repositories and signs you out of this session.
            </p>
          </div>

          <div style={cardShellStyle}>
            <h3 style={sectionLabelStyle}>About</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px",
                color: "#a1a1aa",
              }}
            >
              {[
                ["Platform", "VeloCore"],
                ["Deployed projects", deployments.length],
                ["Active repositories", repos?.length || 0],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "#52525b" }}>{label}</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "#e4e4e7",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* DANGER ZONE */}
          <div
            style={{
              ...cardShellStyle,
              gridColumn: "1 / -1",
              border: "1px solid rgba(248,113,113,0.25)",
              backgroundColor: "rgba(248,113,113,0.03)",
            }}
          >
            <h3 style={{ ...sectionLabelStyle, color: "#f87171" }}>
              Danger Zone
            </h3>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <p
                style={{
                  fontSize: "12.5px",
                  color: "#a1a1aa",
                  lineHeight: 1.6,
                  margin: 0,
                  maxWidth: "480px",
                }}
              >
                Permanently delete your VeloCore account, including all
                deployment records and stored GitHub credentials. This cannot be
                undone.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#f87171",
                  backgroundColor: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.4)",
                  padding: "9px 16px",
                  borderRadius: "7px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
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
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{ ...fieldInputStyle, marginBottom: "18px" }}
          />

          <span style={{ ...sectionLabelStyle, margin: "0 0 10px 0" }}>
            Environment Variables
          </span>
          <div
            style={{
              maxHeight: "260px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            <EnvVarTable
              rows={modalEnvRows}
              onChangeRow={(id, field, val) =>
                updateRows(setModalEnvRows, id, field, val)
              }
              onAddRow={() => addRow(setModalEnvRows)}
              onRemoveRow={(id) => removeRowFrom(setModalEnvRows, id)}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <button
              onClick={() => setShowDeployModal(false)}
              disabled={deployingModal}
              style={modalCancelButtonStyle}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeploy}
              disabled={deployingModal}
              style={{
                ...modalPrimaryButtonStyle,
                opacity: deployingModal ? 0.6 : 1,
                cursor: deployingModal ? "not-allowed" : "pointer",
              }}
            >
              {deployingModal ? "Deploying..." : "Deploy"}
            </button>
          </div>
        </Modal>
      )}

      {/* FREE-TIER LIMIT REACHED POPUP */}
      {showLimitPopup && (
        <Modal maxWidth="380px" accent="rgba(250,204,21,0.35)">
          <h3 style={{ ...modalTitleStyle, color: "#facc15" }}>
            Free-tier limit reached
          </h3>
          <p style={modalSubtitleStyle}>
            You already have {activeCount} running deployment
            {activeCount === 1 ? "" : "s"}, and the free tier allows{" "}
            {FREE_TIER_LIMIT}. Stop or delete an existing deployment from the
            Deployed tab before creating a new one.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowLimitPopup(false)}
              style={modalPrimaryButtonStyle}
            >
              Got it
            </button>
          </div>
        </Modal>
      )}

      {/* DELETE ACCOUNT CONFIRM MODAL */}
      {showDeleteConfirm && (
        <Modal>
          <h3 style={modalTitleStyle}>Delete your account?</h3>
          <p style={modalSubtitleStyle}>
            This will permanently remove your account, deployment history, and
            GitHub token from VeloCore. This action cannot be undone.
          </p>
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deletingAccount}
              style={modalCancelButtonStyle}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount || !userId}
              style={{
                ...modalPrimaryButtonStyle,
                backgroundColor: "#f87171",
                cursor: deletingAccount ? "not-allowed" : "pointer",
                opacity: deletingAccount ? 0.6 : 1,
              }}
            >
              {deletingAccount ? "Deleting..." : "Yes, delete permanently"}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes dashPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        @media (max-width: 900px) {
          .vc-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
