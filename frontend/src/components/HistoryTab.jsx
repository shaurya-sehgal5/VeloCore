import { useEffect, useState } from "react";
import { SOCKET_URL, MONO } from "../config";

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

const cardStyle = {
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.06)",
  backgroundColor: "rgba(255,255,255,0.02)",
  marginBottom: "10px",
};

const revisionBadgeStyle = {
  display: "inline-block",
  fontFamily: MONO,
  fontSize: "10.5px",
  fontWeight: 600,
  textTransform: "uppercase",
  color: "#38bdf8",
  backgroundColor: "rgba(56,189,248,0.1)",
  border: "1px solid rgba(56,189,248,0.35)",
  padding: "3px 9px",
  borderRadius: "9999px",
  marginBottom: "8px",
};

export default function HistoryTab({ deploymentId }) {
  const [rows, setRows] = useState([]);
  const historyUrl = (id) => `${SOCKET_URL}/api/deployments/${id}/history`;

  useEffect(() => {
    fetch(historyUrl(deploymentId), {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setRows)
      .catch(console.error);
  }, [deploymentId]);

  return (
    <div>
      <div style={sectionLabelStyle}>
        Deployment History{" "}
        <span style={{ color: "#3ecf8e" }}>({rows.length})</span>
      </div>

      {rows.length === 0 ? (
        <p style={mutedTextStyle}>$ no revision history reported yet.</p>
      ) : (
        rows.map((r, index) => (
          <div key={r.id} style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={revisionBadgeStyle}>
                Revision #{rows.length - index}
              </span>

              <span
                style={{
                  color: r.status === "SUCCESS" ? "#3ecf8e" : "#ef4444",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {r.status}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                rowGap: 8,
                columnGap: 20,
                fontSize: 13,
              }}
            >
              <span style={{ color: "#71717a" }}>Branch</span>
              <span>{r.branch}</span>

              <span style={{ color: "#71717a" }}>Commit</span>
              <span
                style={{
                  fontFamily: MONO,
                  color: "#38bdf8",
                }}
              >
                {r.commit_sha?.substring(0, 8)}
              </span>

              <span style={{ color: "#71717a" }}>Author</span>
              <span>{r.commit_author}</span>

              <span style={{ color: "#71717a" }}>Message</span>
              <span>{r.commit_message}</span>

              <span style={{ color: "#71717a" }}>Created</span>
              <span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
