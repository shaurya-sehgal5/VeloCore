import React, { useState } from "react";
import { getStatusStyle } from "../statusMeta";
import { formatFramework } from "../utils";
import { MONO } from "../config";

const btnStyle = {
  fontFamily: MONO,
  fontSize: "11.5px",
  color: "#a1a1aa",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "6px 12px",
  borderRadius: "7px",
  cursor: "pointer",
};
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

function ServiceRow({ service, isLast }) {
  const [copiedField, setCopiedField] = useState(null);
  const style = getStatusStyle(service.status);
  const hasUrl = Boolean(service.url);

  const handleCopy = async (field, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
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
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
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
            fontFamily: MONO,
            fontWeight: 600,
            textTransform: "uppercase",
            backgroundColor: style.bg,
            color: style.fg,
            border: `1px solid ${style.border}`,
            padding: "2px 8px",
            borderRadius: "9999px",
          }}
        >
          {service.status}
        </span>
      </div>

      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "8px",
          padding: "10px 12px",
          marginBottom: "10px",
        }}
      >
        <InfoLine
          label="Framework"
          value={formatFramework(service.framework)}
        />
        <InfoLine label="Engine" value={service.engine} />
        <InfoLine label="Namespace" value={service.namespace} />
        <InfoLine
          label="Deployment"
          value={service.deploymentName || service.deployment}
        />
        <InfoLine label="Service" value={service.serviceName || service.name} />
        <InfoLine label="Container" value={service.container} />
        <InfoLine label="Image" value={service.image} />
        <InfoLine label="Slot" value={service.slot} />
        <InfoLine label="Port" value={service.port} />
      </div>

      {hasUrl && (
        <div
          style={{
            fontSize: "12.5px",
            color: "#3ecf8e",
            fontFamily: MONO,
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
              ...btnStyle,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Open
          </a>
        )}
        {hasUrl && (
          <button
            onClick={() => handleCopy("url", service.url)}
            style={btnStyle}
          >
            {copiedField === "url" ? "Copied!" : "Copy URL"}
          </button>
        )}
        {service.image && (
          <button
            onClick={() => handleCopy("image", service.image)}
            style={btnStyle}
          >
            {copiedField === "image" ? "Copied!" : "Copy Image"}
          </button>
        )}
        {service.namespace && (
          <button
            onClick={() => handleCopy("namespace", service.namespace)}
            style={btnStyle}
          >
            {copiedField === "namespace" ? "Copied!" : "Copy Namespace"}
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(ServiceRow);
