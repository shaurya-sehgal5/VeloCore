import React from "react";
import ServiceRow from "./ServiceRow";
import EnvVarTable from "./EnvVarTable";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import { MONO } from "../config";

const cardShellStyle = {
  backgroundColor: "rgba(255,255,255,0.025)",
  backdropFilter: "blur(12px)",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
};
const sectionLabelStyle = {
  fontSize: "11px",
  fontFamily: MONO,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#a1a1aa",
  fontWeight: 500,
  margin: "0 0 8px 0",
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
const primaryBtnStyle = {
  fontFamily: MONO,
  fontSize: "12.5px",
  fontWeight: 600,
  color: "#08090a",
  backgroundColor: "#3ecf8e",
  border: "none",
  padding: "9px 16px",
  borderRadius: "7px",
  cursor: "pointer",
};
const actionBtnStyle = (color) => ({
  fontFamily: MONO,
  fontSize: "12.5px",
  fontWeight: 600,
  color,
  backgroundColor: `${color}1a`,
  border: `1px solid ${color}59`,
  padding: "9px 16px",
  borderRadius: "7px",
  cursor: "pointer",
});
const serviceCardStyle = {
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.06)",
  backgroundColor: "rgba(255,255,255,0.02)",
  marginBottom: "10px",
};
const serviceDetailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: "6px 16px",
  margin: "10px 0",
  padding: "10px",
  borderRadius: "8px",
  backgroundColor: "rgba(255,255,255,0.015)",
  border: "1px solid rgba(255,255,255,0.05)",
};
const serviceDetailRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
  fontFamily: MONO,
  gap: "8px",
};
const serviceDetailLabelStyle = {
  color: "#52525b",
  flexShrink: 0,
};
const serviceDetailValueStyle = {
  color: "#d4d4d8",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const linkBtnStyle = {
  fontFamily: MONO,
  fontSize: "11.5px",
  fontWeight: 600,
  color: "#38bdf8",
  backgroundColor: "rgba(56,189,248,0.1)",
  border: "1px solid rgba(56,189,248,0.35)",
  padding: "6px 12px",
  borderRadius: "7px",
  cursor: "pointer",
};

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "13px",
        padding: "6px 0",
      }}
    >
      <span style={{ color: "#52525b" }}>{label}</span>
      <span style={{ fontFamily: MONO, color: "#e4e4e7" }}>{value ?? "—"}</span>
    </div>
  );
}

function ServiceDetailRow({ label, value }) {
  return (
    <div style={serviceDetailRowStyle}>
      <span style={serviceDetailLabelStyle}>{label}</span>
      <span style={serviceDetailValueStyle} title={value ?? undefined}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function copyToClipboard(text) {
  if (text) navigator.clipboard.writeText(text);
}

export default function OverviewTab({
  deployment,
  runtimeEngine,
  services,
  servicesLoading,
  servicesError,
  envRows,
  envEditing,
  envLoading,
  envSaving,
  onEditEnv,
  onCancelEnv,
  onSaveEnv,
  onChangeEnvRow,
  onAddEnvRow,
  onRemoveEnvRow,
  onRedeploy,
  onRestart,
  onStop,
  onDeleteClick,
  actionInProgress,
}) {
  return (
    <div>
      <div style={{ ...cardShellStyle, marginBottom: "18px" }}>
        <div style={sectionLabelStyle}>Deployment Information</div>
        <InfoRow label="Deployment ID" value={deployment.id} />
        <InfoRow
          label="Runtime"
          value={runtimeEngine === "kubernetes" ? "Kubernetes" : "Docker"}
        />
        <InfoRow label="Repository" value={deployment.repo_name} />
        <InfoRow
          label="Deployed At"
          value={
            deployment.created_at
              ? new Date(deployment.created_at).toLocaleString()
              : "—"
          }
        />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <div style={sectionLabelStyle}>Runtime Information</div>
        {servicesLoading ? (
          <LoadingState message="fetching runtime services..." />
        ) : servicesError ? (
          <p style={{ color: "#f87171", fontSize: "13.5px", fontFamily: MONO }}>
            $ {servicesError}
          </p>
        ) : services.length === 0 ? (
          <EmptyState message="no services reported for this deployment yet." />
        ) : (
          <div>
            {services.map((service, i) => (
              <div key={`${service.name}-${i}`} style={serviceCardStyle}>
                <ServiceRow service={service} isLast />

                <div style={serviceDetailGridStyle}>
                  <ServiceDetailRow
                    label="Framework"
                    value={service.framework}
                  />
                  <ServiceDetailRow
                    label="Engine"
                    value={
                      runtimeEngine === "kubernetes" ? "Kubernetes" : "Docker"
                    }
                  />
                  <ServiceDetailRow
                    label="Namespace"
                    value={service.namespace}
                  />
                  <ServiceDetailRow
                    label="Deployment"
                    value={service.deployment_name}
                  />
                  <ServiceDetailRow
                    label="Service"
                    value={service.service_name}
                  />
                  <ServiceDetailRow
                    label="Container"
                    value={service.container_name}
                  />
                  <ServiceDetailRow label="Image" value={service.image} />
                  <ServiceDetailRow label="Slot" value={service.slot} />
                  <ServiceDetailRow label="Port" value={service.port} />
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() =>
                      service.url && window.open(service.url, "_blank")
                    }
                    disabled={!service.url}
                    style={{
                      ...linkBtnStyle,
                      opacity: service.url ? 1 : 0.4,
                      cursor: service.url ? "pointer" : "not-allowed",
                    }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => copyToClipboard(service.url)}
                    disabled={!service.url}
                    style={{
                      ...linkBtnStyle,
                      opacity: service.url ? 1 : 0.4,
                      cursor: service.url ? "pointer" : "not-allowed",
                    }}
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => copyToClipboard(service.image)}
                    disabled={!service.image}
                    style={{
                      ...linkBtnStyle,
                      opacity: service.image ? 1 : 0.4,
                      cursor: service.image ? "pointer" : "not-allowed",
                    }}
                  >
                    Copy Image
                  </button>
                  <button
                    onClick={() => copyToClipboard(service.namespace)}
                    disabled={!service.namespace}
                    style={{
                      ...linkBtnStyle,
                      opacity: service.namespace ? 1 : 0.4,
                      cursor: service.namespace ? "pointer" : "not-allowed",
                    }}
                  >
                    Copy Namespace
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "18px" }}>
        <div style={sectionLabelStyle}>Environment Variables</div>
        {envLoading ? (
          <LoadingState message="loading environment variables..." />
        ) : (
          <>
            <EnvVarTable
              rows={envRows}
              readOnly={!envEditing}
              masked={!envEditing}
              onChangeRow={onChangeEnvRow}
              onAddRow={onAddEnvRow}
              onRemoveRow={onRemoveEnvRow}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              {envEditing ? (
                <>
                  <button
                    onClick={onCancelEnv}
                    disabled={envSaving}
                    style={cancelBtnStyle}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSaveEnv}
                    disabled={envSaving}
                    style={{ ...primaryBtnStyle, opacity: envSaving ? 0.6 : 1 }}
                  >
                    {envSaving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button onClick={onEditEnv} style={cancelBtnStyle}>
                  Edit
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div>
        <div style={sectionLabelStyle}>Actions</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={onRedeploy}
            disabled={!!actionInProgress}
            style={actionBtnStyle("#38bdf8")}
          >
            {actionInProgress === "redeploy" ? "Working..." : "Redeploy"}
          </button>
          <button
            onClick={onRestart}
            disabled={!!actionInProgress}
            style={actionBtnStyle("#facc15")}
          >
            {actionInProgress === "restart" ? "Restarting..." : "Restart"}
          </button>
          <button
            onClick={onStop}
            disabled={!!actionInProgress}
            style={actionBtnStyle("#a1a1aa")}
          >
            {actionInProgress === "stop" ? "Stopping..." : "Stop"}
          </button>
          <button
            onClick={onDeleteClick}
            disabled={!!actionInProgress}
            style={actionBtnStyle("#f87171")}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
