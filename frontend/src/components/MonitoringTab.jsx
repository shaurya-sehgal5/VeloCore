import React from 'react';
import { KUBERNETES_DASHBOARD_URL, DOCKER_DASHBOARD_URL, MONO } from '../config';

const sectionLabelStyle = { fontSize: '11px', fontFamily: MONO, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 500, margin: '0 0 8px 0' };
const mutedTextStyle = { color: '#71717a', fontSize: '13px', fontFamily: MONO, margin: '0 0 20px 0' };

const linkCardStyle = (accent) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  flex: '1 1 220px',
  padding: '20px',
  borderRadius: '14px',
  border: `1px solid ${accent}40`,
  backgroundColor: 'rgba(255,255,255,0.025)',
  backdropFilter: 'blur(12px)',
  textDecoration: 'none',
  transition: 'all 0.18s ease',
});

const iconWrapStyle = (accent) => ({
  width: 42,
  height: 42,
  borderRadius: '10px',
  backgroundColor: `${accent}1a`,
  border: `1px solid ${accent}59`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

function DashboardLinkCard({ href, accent, title, subtitle, icon }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...linkCardStyle(accent),
        borderColor: hover ? accent : `${accent}40`,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover ? `0 8px 20px ${accent}22` : 'none',
      }}
    >
      <div style={iconWrapStyle(accent)}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, color: '#fafafa', fontSize: '14.5px', marginBottom: '3px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#71717a', fontFamily: MONO }}>{subtitle}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    </a>
  );
}

export default function MonitoringTab() {
  return (
    <div>
      <div style={sectionLabelStyle}>Monitoring</div>
      <p style={mutedTextStyle}>$ open the live monitoring dashboard for this deployment's runtime engine.</p>

      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <DashboardLinkCard
          href={KUBERNETES_DASHBOARD_URL}
          accent="#38bdf8"
          title="Kubernetes Dashboard"
          subtitle="Pods, nodes & cluster metrics"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v8l-8 8-8-8V6z" />
              <path d="M12 2v20M4 6l8 5 8-5M4 14l8-4 8 4" />
            </svg>
          }
        />
        <DashboardLinkCard
          href={DOCKER_DASHBOARD_URL}
          accent="#3ecf8e"
          title="Docker Dashboard"
          subtitle="Containers & resource usage"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="10" width="4" height="4" />
              <rect x="8" y="10" width="4" height="4" />
              <rect x="13" y="10" width="4" height="4" />
              <rect x="8" y="5" width="4" height="4" />
              <path d="M2 14c0 4 4 6 9 6 6 0 10-3 11-8-1 0-2 .5-3 .5" />
            </svg>
          }
        />
      </div>
    </div>
  );
}