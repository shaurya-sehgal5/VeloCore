import React from "react";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import { formatFramework } from "../utils";
import { MONO } from "../config";

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
  fontFamily: MONO,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#a1a1aa",
  fontWeight: 500,
};
const detailsBtnStyle = {
  fontFamily: MONO,
  fontWeight: 600,
  fontSize: "11.5px",
  color: "#38bdf8",
  backgroundColor: "rgba(56,189,248,0.1)",
  border: "1px solid rgba(56,189,248,0.35)",
  padding: "6px 14px",
  borderRadius: "7px",
  cursor: "pointer",
};
const deleteBtnStyle = (busy) => ({
  fontFamily: MONO,
  fontSize: "11.5px",
  color: "#f87171",
  backgroundColor: "rgba(248,113,113,0.08)",
  border: "1px solid rgba(248,113,113,0.3)",
  padding: "6px 12px",
  borderRadius: "7px",
  cursor: busy ? "not-allowed" : "pointer",
  opacity: busy ? 0.5 : 1,
});
const infoRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  padding: "3px 0",
};
const infoLabelStyle = {
  color: "#52525b",
  fontFamily: MONO,
};
const infoValueStyle = {
  color: "#d4d4d8",
  fontFamily: MONO,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "60%",
};

function InfoLine({ label, value }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value ?? "—"}</span>
    </div>
  );
}

export default function DeploymentTable({
  deployments,
  loading,
  error,
  deletingId,
  onOpenDetails,
  onDelete,
}) {
  return (
    <div style={cardShellStyle}>
      <h3 style={sectionLabelStyle}>
        Deployed Projects{" "}
        <span style={{ color: "#3ecf8e" }}>({deployments.length})</span>
      </h3>

      {loading ? (
        <LoadingState message="fetching deployment records from database..." />
      ) : error ? (
        <p style={{ color: "#f87171", fontSize: "13.5px", fontFamily: MONO }}>
          $ {error}
        </p>
      ) : deployments.length === 0 ? (
        <EmptyState message="no deployments yet — deploy a repo from the Repos tab." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "10px",
          }}
        >
          {deployments.map((dep) => (
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
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: "8px",
                }}
              >
                <InfoLine
                  label="Framework"
                  value={formatFramework(dep.framework)}
                />
                <InfoLine
                  label="Runtime"
                  value={
                    dep.runtime === "kubernetes" ||
                    dep.runtimeEngine === "kubernetes"
                      ? "Kubernetes"
                      : "Docker"
                  }
                />
                <InfoLine
                  label="Created"
                  value={
                    dep.created_at
                      ? new Date(dep.created_at).toLocaleString()
                      : "—"
                  }
                />
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Status</span>
                  <StatusBadge status={dep.status} />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
                <button
                  onClick={() => onOpenDetails(dep)}
                  style={detailsBtnStyle}
                >
                  Details
                </button>
                <button
                  onClick={() => onDelete(dep.id)}
                  disabled={deletingId === dep.id}
                  style={deleteBtnStyle(deletingId === dep.id)}
                >
                  {deletingId === dep.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
