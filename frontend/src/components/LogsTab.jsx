import StatusBadge from "./StatusBadge";
import { MONO } from "../config";
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function LogsTab({ status, logs, active }) {
  const endRef = useRef(null);
  const [mode, setMode] = useState("normal");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  const filteredLogs = useMemo(() => {
    if (mode === "details") return logs;

    return logs.filter((log) => {
      return (
        log.stage !== "KUBERNETES" &&
        log.stage !== "DOCKER" &&
        log.stage !== "NPM" &&
        log.stage !== "HELM_STDOUT" &&
        log.stage !== "KUBECTL_STDOUT"
      );
    });
  }, [logs, mode]);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
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
            Build & Runtime Logs
          </h3>

          <button
            onClick={() => setMode("normal")}
            style={{
              background: mode === "normal" ? "#3ecf8e" : "#161616",
              color: mode === "normal" ? "#000" : "#d4d4d8",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 11,
            }}
          >
            Normal
          </button>

          <button
            onClick={() => setMode("details")}
            style={{
              background: mode === "details" ? "#3ecf8e" : "#161616",
              color: mode === "details" ? "#000" : "#d4d4d8",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 11,
            }}
          >
            Detailed
          </button>
        </div>
        <StatusBadge status={status} />
      </div>

      <div
        style={{
          backgroundColor: "#050505",
          color: "#3ecf8e",
          padding: "16px",
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
          <div style={{ color: "#3f3f46", fontStyle: "italic" }}>
            {active
              ? "$ starting container process..."
              : "$ waiting for deployment trigger..."}
            <span style={{ animation: "blink 1s step-start infinite" }}>▍</span>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: "4px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color:
                  log.level === "ERROR"
                    ? "#f87171"
                    : log.level === "SUCCESS"
                      ? "#3ecf8e"
                      : log.level === "WARNING"
                        ? "#facc15"
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
              <>
                <span style={{ color: "#52525b" }}>[{log.timestamp}]</span>{" "}
                <span
                  style={{
                    color: "#38bdf8",
                    fontWeight: 600,
                  }}
                >
                  [{log.stage}]
                </span>{" "}
                <span
                  style={{
                    color:
                      log.level === "SUCCESS"
                        ? "#3ecf8e"
                        : log.level === "ERROR"
                          ? "#f87171"
                          : log.level === "WARNING"
                            ? "#facc15"
                            : "#60a5fa",
                    fontWeight: 600,
                  }}
                >
                  [{log.level}]
                </span>{" "}
                {log.message}
              </>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
