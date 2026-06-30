import React, { useState, useEffect } from 'react';

function Login({ onGitHubLogin }) {
  const [active, setActive] = useState(0);
  const stages = ['push', 'build', 'deploy', 'edge'];

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % stages.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={s.page}>
      <div style={s.gridBg} />

      {/* ---------- NAV ---------- */}
      <nav style={s.nav}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <span style={s.logoText}>VeloCore</span>
        </div>
        <div style={s.navLinks}>
          <span style={s.navLink}>Docs</span>
          <span style={s.navLink}>Pricing</span>
          <span style={s.navLink}>GitHub</span>
        </div>
      </nav>

      {/* ---------- HERO SPLIT ---------- */}
      <div style={s.hero}>

        {/* LEFT: pitch */}
        <div style={s.left}>
          <div style={s.eyebrow}>
            <span style={s.eyebrowDot} />
            now deploying on edge infrastructure
          </div>

          <h1 style={s.heading}>
            Ship code.<br/>
            <span style={s.headingMuted}>Not infrastructure.</span>
          </h1>

          <p style={s.sub}>
            VeloCore turns a git push into a live deployment — isolated builds,
            global edge delivery, and real-time observability, without touching a server.
          </p>

          <div style={s.ctaRow}>
            <button onClick={onGitHubLogin} style={s.ghBtn}
              onMouseEnter={e => e.currentTarget.style.background = '#d4d4d4'}
              onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0a">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
            <span style={s.ctaNote}>Read-only access · No code stored</span>
          </div>

          <div style={s.statRow}>
            <div style={s.statBlock}>
              <div style={s.statNum}>38s</div>
              <div style={s.statLabel}>avg build time</div>
            </div>
            <div style={s.statDivider} />
            <div style={s.statBlock}>
              <div style={s.statNum}>99.9%</div>
              <div style={s.statLabel}>uptime SLA</div>
            </div>
            <div style={s.statDivider} />
            <div style={s.statBlock}>
              <div style={s.statNum}>0</div>
              <div style={s.statLabel}>servers managed</div>
            </div>
          </div>
        </div>

        {/* RIGHT: animated pipeline diagram */}
        <div style={s.right}>
          <div style={s.diagramCard}>
            <div style={s.diagramHead}>
              <span style={s.diagramTitle}>live pipeline</span>
              <span style={s.diagramBadge}><span style={s.liveDot}/>tracking</span>
            </div>

            <div style={s.pipeline}>
              {[
                { key: 'push', label: 'Git Push', sub: 'webhook trigger', icon: 'M5 12h14M12 5l7 7-7 7' },
                { key: 'build', label: 'Isolated Build', sub: 'docker container', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
                { key: 'deploy', label: 'S3 Artifact', sub: 'object storage', icon: 'M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2m18 0v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0L12 13 3 8' },
                { key: 'edge', label: 'Edge Delivery', sub: 'nginx + cdn', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
              ].map((node, i) => {
                const isActive = stages[active] === node.key;
                const isPast = stages.indexOf(node.key) < active;
                return (
                  <React.Fragment key={node.key}>
                    <div style={{
                      ...s.node,
                      borderColor: isActive ? '#3ecf8e' : '#1c1c1c',
                      background: isActive ? 'rgba(62,207,142,0.06)' : '#0d0d0d',
                    }}>
                      <div style={{
                        ...s.nodeIcon,
                        borderColor: isActive ? '#3ecf8e' : '#1f1f1f',
                        background: isActive ? 'rgba(62,207,142,0.1)' : '#111',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke={isActive ? '#3ecf8e' : '#525252'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={node.icon}/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ ...s.nodeLabel, color: isActive ? '#f0f0f0' : '#888' }}>{node.label}</div>
                        <div style={s.nodeSub}>{node.sub}</div>
                      </div>
                      {isActive && <div style={s.pulseRing} />}
                    </div>
                    {i < 3 && (
                      <div style={s.connector}>
                        <div style={{
                          ...s.connectorFill,
                          height: isPast || isActive ? '100%' : '0%',
                        }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div style={s.diagramFoot}>
              <div style={s.footMetric}><span style={s.footDot}/>prometheus: scraping /metrics</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', width: '100%', background: '#0a0a0a', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  gridBg: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
    backgroundSize: '56px 56px',
  },
  nav: {
    position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '24px 56px', borderBottom: '1px solid #141414',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { width: 26, height: 26, background: '#fafafa', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 500, color: '#e4e4e4' },
  navLinks: { display: 'flex', gap: 28 },
  navLink: { fontSize: 13.5, color: '#666', cursor: 'pointer' },

  hero: {
    position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center',
    minHeight: 'calc(100vh - 73px)', padding: '0 56px', gap: 64,
    flexWrap: 'wrap',
  },
  left: { flex: '1 1 460px', maxWidth: 560, paddingTop: 40, paddingBottom: 40 },
  eyebrow: {
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#3ecf8e',
    fontFamily: "'JetBrains Mono', monospace", background: 'rgba(62,207,142,0.07)',
    border: '1px solid rgba(62,207,142,0.2)', padding: '6px 12px', borderRadius: 20, marginBottom: 28,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: '50%', background: '#3ecf8e' },
  heading: { fontSize: 'clamp(38px, 4.5vw, 58px)', fontWeight: 700, color: '#fafafa', lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 22 },
  headingMuted: { color: '#54545a' },
  sub: { fontSize: 16.5, color: '#8a8a8a', lineHeight: 1.65, maxWidth: 460, marginBottom: 36 },

  ctaRow: { display: 'flex', alignItems: 'center', gap: 18, marginBottom: 48, flexWrap: 'wrap' },
  ghBtn: {
    padding: '15px 26px', background: '#fafafa', color: '#0a0a0a', border: 'none', borderRadius: 8,
    fontSize: 14.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
    transition: 'background 0.15s', fontFamily: 'inherit',
  },
  ctaNote: { fontSize: 12.5, color: '#454545', fontFamily: "'JetBrains Mono', monospace" },

  statRow: { display: 'flex', alignItems: 'center', gap: 28, paddingTop: 32, borderTop: '1px solid #161616' },
  statBlock: {},
  statNum: { fontSize: 24, fontWeight: 700, color: '#e4e4e4', letterSpacing: '-0.5px' },
  statLabel: { fontSize: 12, color: '#4a4a4a', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" },
  statDivider: { width: 1, height: 32, background: '#1a1a1a' },

  right: { flex: '1 1 420px', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: 480 },
  diagramCard: { width: '100%', background: '#0d0d0d', border: '1px solid #161616', borderRadius: 14, padding: 26 },
  diagramHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  diagramTitle: { fontSize: 11.5, color: '#525252', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px' },
  diagramBadge: { fontSize: 11, color: '#3ecf8e', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 },
  liveDot: { width: 5, height: 5, borderRadius: '50%', background: '#3ecf8e' },

  pipeline: { display: 'flex', flexDirection: 'column' },
  node: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10,
    border: '1px solid', position: 'relative', transition: 'all 0.4s ease',
  },
  nodeIcon: {
    width: 36, height: 36, borderRadius: 8, border: '1px solid', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.4s ease',
  },
  nodeLabel: { fontSize: 14, fontWeight: 600, transition: 'color 0.4s ease' },
  nodeSub: { fontSize: 11.5, color: '#454545', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 },
  pulseRing: { position: 'absolute', right: 14, width: 7, height: 7, borderRadius: '50%', background: '#3ecf8e', boxShadow: '0 0 0 4px rgba(62,207,142,0.15)' },
  connector: { width: 2, height: 22, background: '#161616', marginLeft: 32, position: 'relative', overflow: 'hidden' },
  connectorFill: { position: 'absolute', top: 0, left: 0, width: '100%', background: '#3ecf8e', transition: 'height 0.5s ease' },

  diagramFoot: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #161616' },
  footMetric: { fontSize: 11, color: '#454545', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 },
  footDot: { width: 5, height: 5, borderRadius: '50%', background: '#2d2d2d' },
};

export default Login;