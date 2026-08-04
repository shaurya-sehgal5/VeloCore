import React from "react";
import { KUBERNETES_DASHBOARD_URL } from "../config";

export default function GrafanaViewer() {
  return (
    <div
      style={{
        height: "80vh",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,.08)",
        background: "#111",
      }}
    >
      <iframe
        title="Grafana"
        src={`${KUBERNETES_DASHBOARD_URL}?orgId=1&kiosk=tv&theme=dark&refresh=30s`}
        width="100%"
        height="100%"
        frameBorder="0"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        style={{
          border: 0,
        }}
      />
    </div>
  );
}