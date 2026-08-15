import React from "react";
import Modal from "./Modal";
import EnvVarTable from "./EnvVarTable";
import { MONO } from "../config";

const titleStyle = {
  margin: "0 0 10px 0",
  fontSize: "15px",
  color: "#fafafa",
  fontWeight: 600,
};
const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontFamily: MONO,
  color: "#71717a",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "6px",
};
const inputStyle = {
  width: "100%",
  backgroundColor: "#050505",
  color: "#e4e4e7",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontFamily: MONO,
  fontSize: "13px",
  boxSizing: "border-box",
  marginBottom: "18px",
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

function EnvPasteBox({ title, value, onChange, placeholder }) {
  const variableCount = value
    ? value.split(/\r?\n/).filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith("#") && trimmed.includes("=");
      }).length
    : 0;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        padding: "14px",
        background: "rgba(255,255,255,0.015)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontFamily: MONO,
            color: "#3ecf8e",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {title}
        </span>

        {variableCount > 0 && (
          <span
            style={{
              fontSize: "10px",
              fontFamily: MONO,
              color: "#71717a",
              backgroundColor: "rgba(62,207,142,0.08)",
              border: "1px solid rgba(62,207,142,0.2)",
              borderRadius: "5px",
              padding: "2px 7px",
              whiteSpace: "nowrap",
            }}
          >
            {variableCount} {variableCount === 1 ? "variable" : "variables"}
          </span>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        style={{
          width: "100%",
          flex: 1,
          minHeight: "220px",
          resize: "vertical",
          boxSizing: "border-box",
          background: "#050505",
          color: "#d4d4d8",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "7px",
          padding: "10px",
          fontFamily: MONO,
          fontSize: "12px",
          lineHeight: 1.6,
          outline: "none",
        }}
      />

      <div
        style={{
          marginTop: "8px",
          fontSize: "10.5px",
          color: "#52525b",
          fontFamily: MONO,
          lineHeight: 1.5,
        }}
      >
        Paste your complete .env file. VeloCore automatically extracts each
        variable.
      </div>
    </div>
  );
}

const FRONTEND_PLACEHOLDER = `VITE_API_URL=https://api.yourapp.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
NODE_ENV=production`;

const BACKEND_PLACEHOLDER = `MONGODB_URI=mongodb+srv://...
PORT=8080
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
CORS_ORIGIN=https://yourapp.com`;

export default function DeployModal({
  repo,
  projectName,
  onProjectNameChange,

  frontendEnvText,
  backendEnvText,

  onFrontendEnvChange,
  onBackendEnvChange,

  deploying,
  onCancel,
  onConfirm,
}) {
  if (!repo) return null;
  return (
    <Modal maxWidth="820px">
      <h3 style={titleStyle}>Deployment Configuration</h3>

      <label style={labelStyle}>Project Name</label>
      <input
        value={projectName}
        onChange={(e) => onProjectNameChange(e.target.value)}
        style={inputStyle}
      />

      <span style={{ ...labelStyle, marginBottom: "10px" }}>
        Environment Configuration
      </span>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
          maxHeight: "430px",
        }}
      >
        <EnvPasteBox
          title="Frontend .env"
          value={frontendEnvText}
          onChange={onFrontendEnvChange}
          placeholder={FRONTEND_PLACEHOLDER}
        />

        <EnvPasteBox
          title="Backend .env"
          value={backendEnvText}
          onChange={onBackendEnvChange}
          placeholder={BACKEND_PLACEHOLDER}
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
        <button onClick={onCancel} disabled={deploying} style={cancelBtnStyle}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deploying}
          style={{
            ...primaryBtnStyle,
            opacity: deploying ? 0.6 : 1,
            cursor: deploying ? "not-allowed" : "pointer",
          }}
        >
          {deploying ? "Deploying..." : "Deploy"}
        </button>
      </div>
    </Modal>
  );
}
