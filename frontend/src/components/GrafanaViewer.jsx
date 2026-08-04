import React, { useState, useRef, useCallback } from "react";
import { KUBERNETES_DASHBOARD_URL } from "../config";
import { MONO } from "../config";

const wrapStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.025)",
  backdropFilter: "blur(12px)",
  overflow: "hidden",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 18px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  flexWrap: "wrap",
};

const eyebrowStyle = {
  fontFamily: MONO,
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#a1a1aa",
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: "9px",
};

const iconBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "30px",
  height: "30px",
  borderRadius: "7px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "#a1a1aa",
  cursor: "pointer",
  transition:
    "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
};

function RefreshIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v6h-6" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}

export default function GrafanaViewer() {
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef(null);

  const src = `${KUBERNETES_DASHBOARD_URL}&kiosk=tv&theme=dark`;

  const handleRefresh = useCallback(() => {
    setLoaded(false);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        ...wrapStyle,
        position: expanded ? "fixed" : "relative",
        inset: expanded ? "20px" : "auto",
        zIndex: expanded ? 200 : "auto",
        boxShadow: expanded ? "0 30px 80px -20px rgba(0,0,0,0.7)" : "none",
      }}
    >
      <div style={headerStyle}>
        <div style={eyebrowStyle}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: loaded ? "#3ecf8e" : "#facc15",
              boxShadow: loaded
                ? "0 0 0 3px rgba(62,207,142,0.18)"
                : "0 0 0 3px rgba(250,204,21,0.18)",
              flexShrink: 0,
              animation: loaded
                ? "none"
                : "grafPulse 1.3s ease-in-out infinite",
            }}
          />
          Grafana{" "}
          <span style={{ color: "#52525b", fontWeight: 400 }}>
            // kubernetes monitoring
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleRefresh}
            title="Reload dashboard"
            style={iconBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#3ecf8e";
              e.currentTarget.style.borderColor = "rgba(62,207,142,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#a1a1aa";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <RefreshIcon />
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Grafana"
            style={{ ...iconBtnStyle, textDecoration: "none" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#38bdf8";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#a1a1aa";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <ExternalLinkIcon />
          </a>
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Exit fullscreen" : "Expand"}
            style={iconBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fafafa";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#a1a1aa";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: expanded ? "calc(100% - 59px)" : "80vh",
          background: "#0b0c0d",
        }}
      >
        {!loaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              color: "#52525b",
              fontFamily: MONO,
              fontSize: "12.5px",
              backgroundImage:
                "radial-gradient(circle at 50% 40%, rgba(62,207,142,0.05) 0%, transparent 55%)",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.08)",
                borderTopColor: "#3ecf8e",
                animation: "grafSpin 0.8s linear infinite",
              }}
            />
            <span>$ connecting to dashboard...</span>
          </div>
        )}
        <iframe
          key={reloadKey}
          title="Grafana"
          src={src}
          width="100%"
          height="100%"
          frameBorder="0"
          onLoad={() => setLoaded(true)}
          style={{
            border: "none",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        />
      </div>

      <style>{`
        @keyframes grafPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes grafSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
