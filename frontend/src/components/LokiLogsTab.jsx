import React, { useEffect, useMemo, useState } from "react";
import { MONO } from "../config";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const LEVEL_COLOR = {
  ALL: "#a1a1aa",
  INFO: "#60a5fa",
  SUCCESS: "#3ecf8e",
  ERROR: "#f87171",
  WARNING: "#facc15",
  DEBUG: "#a1a1aa",
};

const LEVELS = ["ALL", "INFO", "SUCCESS", "WARNING", "ERROR", "DEBUG"];

const sectionLabelStyle = {
  margin: "0 0 12px 0",
  fontSize: "11px",
  fontFamily: MONO,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#a1a1aa",
  fontWeight: 500,
};

const mutedTextStyle = {
  color: "#52525b",
  fontSize: "13.5px",
  fontFamily: MONO,
};

function SearchInput({ value, onChange }) {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#52525b"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: "absolute",
          left: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <circle cx="10" cy="10" r="6.5" />
        <path d="M20 20l-5.5-5.5" />
      </svg>
      <input
        value={value}
        onChange={onChange}
        placeholder="Search logs..."
        style={{
          width: "100%",
          backgroundColor: "#050505",
          color: "#e4e4e7",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "9px 12px 9px 34px",
          fontFamily: MONO,
          fontSize: "12.5px",
          boxSizing: "border-box",
          outline: "none",
        }}
      />
    </div>
  );
}

function LevelSelect({ value, onChange }) {
  const color = LEVEL_COLOR[value] || "#a1a1aa";
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundColor: "#050505",
          color,
          border: `1px solid ${color}59`,
          borderRadius: "8px",
          padding: "9px 34px 9px 14px",
          fontFamily: MONO,
          fontSize: "12.5px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {LEVELS.map((lvl) => (
          <option
            key={lvl}
            value={lvl}
            style={{
              backgroundColor: "#0c0d0e",
              color: LEVEL_COLOR[lvl] || "#e4e4e7",
            }}
          >
            {lvl}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

export default function LokiLogsTab({ deploymentId }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");

  useEffect(() => {
    if (deploymentId) load();
  }, [deploymentId]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/logs/deployment/${deploymentId}`, {
        credentials: "include",
      });
      const d = await r.json();
      const f = [];
      (d.logs || []).forEach((s) =>
        (s.values || []).forEach((v) =>
          f.push({
            ts: Number(v[0]) / 1e6,
            message: v[1],
            level: s.stream?.level || "INFO",
            stage: s.stream?.stage || "-",
          }),
        ),
      );
      f.sort((a, b) => a.ts - b.ts);
      setLogs(f);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      logs.filter(
        (l) =>
          (level === "ALL" || l.level === level) &&
          (!search || l.message.toLowerCase().includes(search.toLowerCase())),
      ),
    [logs, level, search],
  );

  if (loading) return <p style={mutedTextStyle}>$ loading loki logs...</p>;

  return (
    <div>
      <div style={sectionLabelStyle}>
        Application Logs (Loki){" "}
        <span style={{ color: "#3ecf8e" }}>({filtered.length})</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <LevelSelect value={level} onChange={(e) => setLevel(e.target.value)} />
      </div>

      <div
        style={{
          backgroundColor: "#050505",
          height: 500,
          overflowY: "auto",
          padding: "16px",
          borderRadius: "10px",
          border: "1px solid rgba(62,207,142,0.1)",
          boxShadow: "inset 0 2px 8px 0 rgba(0,0,0,0.6)",
          fontFamily: MONO,
          fontSize: "12.5px",
          lineHeight: "1.7",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: "#3f3f46", fontStyle: "italic" }}>
            $ no logs match your filters.
          </div>
        ) : (
          filtered.map((l, i) => {
            const color = LEVEL_COLOR[l.level] || "#e4e4e7";
            return (
              <div
                key={i}
                style={{
                  marginBottom: "4px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <span style={{ color: "#52525b" }}>
                  {new Date(l.ts).toLocaleTimeString()}
                </span>{" "}
                <span
                  style={{
                    fontWeight: 600,
                    color,
                    backgroundColor: `${color}1a`,
                    border: `1px solid ${color}59`,
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontSize: "11px",
                  }}
                >
                  {l.level}
                </span>{" "}
                <span
                  style={{
                    color: "#38bdf8",
                    backgroundColor: "rgba(56,189,248,0.1)",
                    border: "1px solid rgba(56,189,248,0.35)",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontSize: "11px",
                  }}
                >
                  {l.stage}
                </span>{" "}
                <span style={{ color: "#d4d4d8" }}>{l.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
