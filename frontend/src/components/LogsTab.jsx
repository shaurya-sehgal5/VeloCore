import StatusBadge from "./StatusBadge";
import { MONO } from "../config";
import React, { useEffect, useMemo, useRef, useState } from "react";

const LEVEL_TEXT_COLOR = {
  ERROR: "#f87171",
  SUCCESS: "#3ecf8e",
  WARNING: "#facc15",
};
const LEVEL_TAG_COLOR = {
  ERROR: "#f87171",
  SUCCESS: "#3ecf8e",
  WARNING: "#facc15",
};

const STATUS_COLOR = {
  SUCCESS: "#3ecf8e",
  ERROR: "#f87171",
  WARNING: "#facc15",
  INFO: "#38bdf8",
};

const STATUS_LABEL = {
  SUCCESS: "Success",
  ERROR: "Failed",
  WARNING: "Warning",
  INFO: "Running",
};

const STAGE_DEFS = {
  REPOSITORY: {
    label: "Repository",
  },

  ANALYSIS: {
    label: "Analysis",
  },

  GITLEAKS: {
    label: "Gitleaks",
  },

  SONARQUBE: {
    label: "SonarQube",
  },

  DEPENDENCIES: {
    label: "Dependencies",
  },

  BUILD: {
    label: "Build",
  },

  DOCKER: {
    label: "Docker",
  },

  TRIVY: {
    label: "Trivy",
  },

  REGISTRY: {
    label: "Registry",
  },

  HELM: {
    label: "Helm",
  },

  KUBERNETES: {
    label: "Kubernetes",
  },

  HEALTH: {
    label: "Health",
  },

  RUNTIME: {
    label: "Runtime",
  },

  ROLLBACK: {
    label: "Rollback",
  },
};

const STAGE_LOOKUP = {};
STAGE_DEFS.forEach((def) => {
  def.match.forEach((raw) => {
    STAGE_LOOKUP[raw] = def.key;
  });
});

function canonicalStageKey(rawStage) {
  const s = (rawStage || "").toString().toUpperCase().trim();
  return STAGE_LOOKUP[s] || "OTHER";
}

function truncate(str, max) {
  if (!str) return str;
  return str.length > max ? str.slice(0, max - 1).trimEnd() + "…" : str;
}

function StatusIcon({ status }) {
  const color = STATUS_COLOR[status];
  if (status === "INFO") {
    return (
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          border: `2px solid ${color}`,
          borderTopColor: "transparent",
          display: "inline-block",
          animation: "vc-spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
    );
  }
  const glyph = status === "SUCCESS" ? "✓" : status === "ERROR" ? "✕" : "⚠";
  return (
    <span
      style={{
        width: 14,
        height: 14,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {glyph}
    </span>
  );
}

const StageLogLine = React.memo(function StageLogLine({ log }) {
  return (
    <div
      style={{
        marginBottom: "5px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        color: LEVEL_TEXT_COLOR[log.level] || "#d4d4d8",
      }}
    >
      <span style={{ color: "#52525b" }}>[{log.timestamp}]</span>{" "}
      <span
        style={{
          color: LEVEL_TAG_COLOR[log.level] || "#60a5fa",
          fontWeight: 600,
        }}
      >
        [{log.level}]
      </span>{" "}
      {log.message}
    </div>
  );
});

const StageRow = React.memo(function StageRow({ group, open, onToggle }) {
  const color = STATUS_COLOR[group.status];
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "12px 16px",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              color: "#71717a",
              fontSize: 9,
            }}
          >
            ▶
          </span>
          <StatusIcon status={group.status} />
          <span
            style={{
              fontFamily: MONO,
              fontSize: "12.5px",
              color: "#e4e4e7",
              fontWeight: 600,
            }}
          >
            {group.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{ fontFamily: MONO, fontSize: "10.5px", color: "#71717a" }}
          >
            {group.allCount} log{group.allCount !== 1 ? "s" : ""}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "10.5px",
              color,
              fontWeight: 600,
            }}
          >
            {STATUS_LABEL[group.status]}
          </span>
        </div>
      </button>

      {!open && (
        <div
          style={{
            padding: "0 16px 10px 34px",
            fontFamily: MONO,
            fontSize: "11.5px",
            color: "#a1a1aa",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {group.summary}
        </div>
      )}

      {open && (
        <div style={{ padding: "2px 16px 14px 34px" }}>
          {group.displayLogs.length === 0 ? (
            <div
              style={{
                color: "#52525b",
                fontFamily: MONO,
                fontSize: "11.5px",
                fontStyle: "italic",
              }}
            >
              No logs available for this stage yet.
            </div>
          ) : (
            group.displayLogs.map((log, i) => (
              <StageLogLine key={i} log={log} />
            ))
          )}
        </div>
      )}
    </div>
  );
});

export default function LogsTab({ status, logs, active }) {
  const endRef = useRef(null);
  const [manualOpen, setManualOpen] = useState({});

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [logs]);

  const groupCacheRef = useRef({ len: 0, buckets: {} });

  const groups = useMemo(() => {
    const cache = groupCacheRef.current;
    const reset = logs.length < cache.len;

    const startIdx = reset ? 0 : cache.len;
    const buckets = reset ? {} : cache.buckets;

    for (let i = startIdx; i < logs.length; i++) {
      const log = logs[i];
      const key = canonicalStageKey(log.stage);
      if (!buckets[key]) {
        buckets[key] = {
          all: [],
          curated: [],
          hasError: false,
          hasSuccess: false,
          hasWarning: false,
          lastErrorMsg: null,
        };
      }
      const b = buckets[key];
      b.all.push(log);
      if (!log.detailed) b.curated.push(log);

      if (log.level === "ERROR") {
        b.hasError = true;
        b.lastErrorMsg = truncate(log.message, 140);
      } else if (log.level === "SUCCESS") {
        b.hasSuccess = true;
      } else if (log.level === "WARNING") {
        b.hasWarning = true;
      }
    }

    groupCacheRef.current = { len: logs.length, buckets };

    const orderedKeys = [...STAGE_DEFS.map((d) => d.key), "OTHER"];

    return orderedKeys
      .filter((key) => buckets[key] && buckets[key].all.length > 0)
      .map((key) => {
        const def = STAGE_DEFS.find((d) => d.key === key);
        const label = def ? def.label : "Other";
        const bucket = buckets[key];
        const status = bucket.hasError
          ? "ERROR"
          : bucket.hasSuccess
            ? "SUCCESS"
            : bucket.hasWarning
              ? "WARNING"
              : "INFO";
        const displayLogs = bucket.curated.length ? bucket.curated : bucket.all;

        let summary;
        if (status === "ERROR" && bucket.lastErrorMsg) {
          summary = bucket.lastErrorMsg;
        } else {
          const source = bucket.curated.length ? bucket.curated : bucket.all;
          summary = source.length
            ? truncate(source[source.length - 1].message, 140)
            : `${label} completed`;
        }

        return {
          key,
          label,
          status,
          allCount: bucket.all.length,
          displayLogs,
          summary,
        };
      });
  }, [logs]);

  const curatedCount = useMemo(() => {
    let n = 0;
    for (const key in groupCacheRef.current.buckets) {
      n += groupCacheRef.current.buckets[key].curated.length;
    }
    return n;
  }, [groups]);

  const viewLogCount = curatedCount;

  function isOpen(group) {
    if (manualOpen[group.key] !== undefined) return manualOpen[group.key];
    return group.status === "ERROR" || group.status === "INFO";
  }

  function toggleStage(group) {
    setManualOpen((prev) => ({ ...prev, [group.key]: !isOpen(group) }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes vc-spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "13px",
              fontFamily: MONO,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#a1a1aa",
              fontWeight: 500,
            }}
          >
            Deployment Logs
          </h3>

          {logs.length > 0 && (
            <span
              style={{ fontFamily: MONO, fontSize: "10.5px", color: "#52525b" }}
            >
              {groups.length} stage{groups.length !== 1 ? "s" : ""} ·{" "}
              {viewLogCount} log{viewLogCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <div
        style={{
          backgroundColor: "#050505",
          borderRadius: "10px",
          fontFamily: MONO,
          fontSize: "12.5px",
          lineHeight: "1.7",
          height: "440px",
          overflowY: "auto",
          border: "1px solid rgba(62,207,142,0.1)",
          boxShadow: "inset 0 2px 8px 0 rgba(0,0,0,0.6)",
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{ color: "#3f3f46", fontStyle: "italic", padding: "16px" }}
          >
            $ waiting for deployment logs...
            <span style={{ animation: "blink 1s step-start infinite" }}>▍</span>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <StageRow
                key={group.key}
                group={group}
                open={isOpen(group)}
                onToggle={() => toggleStage(group)}
              />
            ))}
          </>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
