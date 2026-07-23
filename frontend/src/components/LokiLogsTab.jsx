import React, { useEffect, useMemo, useState } from "react";
import { MONO } from "../config";
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const LEVEL_COLOR = {
  INFO: "#60a5fa",
  SUCCESS: "#3ecf8e",
  ERROR: "#f87171",
  WARNING: "#facc15",
  DEBUG: "#a1a1aa",
};
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
  if (loading)
    return <div style={{ fontFamily: MONO }}>Loading Loki logs...</div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          style={{ flex: 1, padding: 10 }}
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option>ALL</option>
          <option>INFO</option>
          <option>SUCCESS</option>
          <option>WARNING</option>
          <option>ERROR</option>
          <option>DEBUG</option>
        </select>
      </div>
      <div
        style={{
          background: "#050505",
          height: 500,
          overflowY: "auto",
          padding: 15,
          fontFamily: MONO,
          fontSize: 12,
        }}
      >
        {filtered.map((l, i) => (
          <div key={i}>
            <span style={{ color: "#666" }}>
              {new Date(l.ts).toLocaleTimeString()}
            </span>{" "}
            <span style={{ color: LEVEL_COLOR[l.level] || "#fff" }}>
              [{l.level}]
            </span>{" "}
            <span style={{ color: "#38bdf8" }}>[{l.stage}]</span>{" "}
            <span>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
