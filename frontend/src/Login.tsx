import React, { useState, useEffect, useMemo } from 'react';
import LogoLoop from './components/LogoLoop/LogoLoop';


const STACK = [
  { name: 'GitHub', slug: 'github' },
  { name: 'GitHub Actions', slug: 'githubactions' },
  { name: 'Docker', slug: 'docker' },
  { name: 'Kubernetes', slug: 'kubernetes' },
  { name: 'Nginx', slug: 'nginx' },
  { name: 'Redis', slug: 'redis' },
  { name: 'PostgreSQL', slug: 'postgresql' },
  { name: 'Node.js', slug: 'nodedotjs' },
  { name: 'React', slug: 'react' },
  { name: 'AWS', slug: 'amazonaws' },
];

function StackIcon({ name, slug, size = 32 }) {
  const [failed, setFailed] = useState(!slug);
  return (
    <div style={s.stackBadge}>
      {failed ? (
        <span style={s.stackFallbackText}>{name.slice(0, 2).toUpperCase()}</span>
      ) : (
        <img
          src={`https://cdn.simpleicons.org/${slug}`}
          alt={name}
          width={size}
          height={size}
          draggable={false}
          onError={() => setFailed(true)}
          style={s.stackImg}
        />
      )}
    </div>
  );
}

// ---------- the exact 5-step deployment flow ----------
const STEPS = [
  {
    key: 'push',
    num: '01',
    label: 'Git Push',
    desc: 'Commit lands on main, webhook fires instantly',
    slug: 'github',
  },
  {
    key: 'ci',
    num: '02',
    label: 'CI Pipeline',
    desc: 'Lint, test and typecheck run in GitHub Actions',
    slug: 'githubactions',
  },
  {
    key: 'build',
    num: '03',
    label: 'Docker Build',
    desc: 'Image is built, tagged and pushed to the registry',
    slug: 'docker',
  },
  {
    key: 'deploy',
    num: '04',
    label: 'Kubernetes Rollout',
    desc: 'New pods roll out with zero downtime',
    slug: 'kubernetes',
  },
  {
    key: 'edge',
    num: '05',
    label: 'Live on Edge',
    desc: 'Nginx routes global traffic to the new release',
    slug: 'nginx',
  },
];

function Login({ onGitHubLogin }) {
  const [active, setActive] = useState(0);

  const STACK_LOGOS = useMemo(
    () =>
      STACK.map((item) => ({
        node: (
          <div style={s.stackItem}>
            <StackIcon name={item.name} slug={item.slug} />
            <span style={s.stackName}>{item.name}</span>
          </div>
        ),
        ariaLabel: item.name,
      })),
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % STEPS.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={s.page}>
      {/* ambient futuristic backdrop */}
      <div style={s.bgGrid} />
      <div style={{ ...s.bgOrb, top: '-10%', left: '8%', background: 'rgba(62,207,142,0.10)' }} />
      <div style={{ ...s.bgOrb, top: '30%', right: '4%', background: 'rgba(56,189,248,0.07)', animationDelay: '2.5s' }} />
      <div style={s.bgVignette} />

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
          <span style={s.navLink}>GitHub</span>
        </div>
      </nav>

      {/* ---------- HERO SPLIT ---------- */}
      <div style={s.hero}>

        {/* LEFT: pitch */}
        <div style={{ ...s.left, animation: 'fadeSlideUp 0.7s ease both' }}>
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

        {/* RIGHT: precise 5-step pipeline */}
        <div style={{ ...s.right, animation: 'fadeSlideUp 0.7s ease 0.15s both' }}>
          <div style={s.diagramCard}>
            <span style={{ ...s.hudCorner, top: -1, left: -1, borderRight: 'none', borderBottom: 'none' }} />
            <span style={{ ...s.hudCorner, top: -1, right: -1, borderLeft: 'none', borderBottom: 'none' }} />
            <span style={{ ...s.hudCorner, bottom: -1, left: -1, borderRight: 'none', borderTop: 'none' }} />
            <span style={{ ...s.hudCorner, bottom: -1, right: -1, borderLeft: 'none', borderTop: 'none' }} />
            <div style={s.diagramGlow} />

            <div style={s.diagramHead}>
              <span style={s.diagramTitle}>deployment pipeline</span>
              <span style={s.diagramBadge}><span style={s.liveDot}/>live</span>
            </div>

            <div style={s.commitLine}>
              <span style={{ color: '#3ecf8e' }}>$</span> git push origin main
              <span style={s.caret}>▍</span>
            </div>

            <div style={s.pipeline}>
              {STEPS.map((step, i) => {
                const isActive = i === active;
                const isPast = i < active;
                return (
                  <React.Fragment key={step.key}>
                    <div style={{
                      ...s.node,
                      borderColor: isActive ? '#3ecf8e' : isPast ? 'rgba(62,207,142,0.25)' : '#161616',
                      background: isActive ? 'rgba(62,207,142,0.07)' : '#0c0c0d',
                      boxShadow: isActive ? '0 0 0 1px rgba(62,207,142,0.18), 0 10px 26px -10px rgba(62,207,142,0.4)' : 'none',
                    }}>
                      <span style={{ ...s.stepNum, color: isActive ? '#3ecf8e' : isPast ? '#3ecf8e88' : '#3a3a3a' }}>{step.num}</span>

                      <div style={{
                        ...s.nodeIconWrap,
                        borderColor: isActive ? '#3ecf8e' : '#1f1f1f',
                        background: isActive ? 'rgba(62,207,142,0.12)' : '#111',
                      }}>
                        {isActive && <span style={s.nodeIconPulse} />}
                        <img
                          src={`https://cdn.simpleicons.org/${step.slug}${isActive || isPast ? '/3ecf8e' : '/525252'}`}
                          alt={step.label}
                          width={17}
                          height={17}
                          style={{ opacity: isActive || isPast ? 1 : 0.6 }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...s.nodeLabel, color: isActive ? '#f5f5f5' : isPast ? '#c4c4c4' : '#767676' }}>{step.label}</div>
                        <div style={s.nodeSub}>{step.desc}</div>
                      </div>

                      {isPast && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {isActive && <div style={s.pulseRing} />}
                      {isActive && <div style={s.scanLine} />}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={s.connector}>
                        <div style={{ ...s.connectorFill, height: isPast || isActive ? '100%' : '0%' }} />
                        {(isPast || isActive) && <div style={s.connectorPacket} />}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div style={s.diagramFoot}>
              <div style={s.footMetric}><span style={s.footDot}/>prometheus + loki: scraping live metrics</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- STACK LOGO LOOP ---------- */}
      <div style={s.stackSection}>
        <div style={s.stackPanel}>
          <span style={s.stackTopLine} />
          <div style={s.stackHeadRow}>
            <span style={s.stackKicker}>infrastructure</span>
            <h3 style={s.stackHeading}>The stack behind every deploy</h3>
          </div>
          <LogoLoop
            logos={STACK_LOGOS}
            speed={46}
            direction="left"
            gap={64}
            pauseOnHover
            scaleOnHover
            fadeOut
            fadeOutColor="#0a0b0c"
            ariaLabel="Technologies used by VeloCore"
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes ringGrow {
          0% { box-shadow: 0 0 0 0 rgba(62,207,142,0.35); }
          100% { box-shadow: 0 0 0 8px rgba(62,207,142,0); }
        }
        @keyframes packetTravel {
          0% { top: -6px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(320%); }
        }
        @keyframes gridDrift {
          0% { background-position: 0 0; }
          100% { background-position: 56px 56px; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(24px, -18px); }
        }
        @keyframes blinkCaret {
          50% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', width: '100%', background: '#050506', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },

  bgGrid: {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
    backgroundSize: '56px 56px',
    animation: 'gridDrift 18s linear infinite',
    maskImage: 'radial-gradient(ellipse 70% 60% at 50% 20%, black 0%, transparent 75%)',
    WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 20%, black 0%, transparent 75%)',
  },
  bgOrb: {
    position: 'absolute', width: 420, height: 420, borderRadius: '50%', filter: 'blur(90px)',
    zIndex: 0, pointerEvents: 'none', animation: 'orbFloat 12s ease-in-out infinite',
  },
  bgVignette: {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 90% 60% at 50% 0%, transparent 40%, #050506 100%)',
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
  eyebrowDot: { width: 6, height: 6, borderRadius: '50%', background: '#3ecf8e', animation: 'pulseGlow 1.8s ease-in-out infinite' },
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
  diagramCard: {
    width: '100%', background: '#0b0b0c', border: '1px solid #171717', borderRadius: 14, padding: 26,
    position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6)',
  },
  hudCorner: { position: 'absolute', width: 16, height: 16, border: '1.5px solid rgba(62,207,142,0.4)', borderRadius: 3, zIndex: 1 },
  diagramGlow: {
    position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(62,207,142,0.14) 0%, transparent 70%)', pointerEvents: 'none',
  },
  diagramHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative' },
  diagramTitle: { fontSize: 11.5, color: '#525252', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '1px' },
  diagramBadge: { fontSize: 11, color: '#3ecf8e', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' },
  liveDot: { width: 5, height: 5, borderRadius: '50%', background: '#3ecf8e', animation: 'pulseGlow 1.6s ease-in-out infinite' },

  commitLine: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#8a8a8a',
    background: '#050505', border: '1px solid #171717', borderRadius: 8,
    padding: '10px 12px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center',
  },
  caret: { color: '#3ecf8e', animation: 'blinkCaret 1s step-start infinite', marginLeft: 2 },

  pipeline: { display: 'flex', flexDirection: 'column', position: 'relative' },
  node: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10,
    border: '1px solid', position: 'relative', transition: 'all 0.4s ease', overflow: 'hidden',
  },
  stepNum: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 700, width: 16, flexShrink: 0,
  },
  nodeIconWrap: {
    width: 32, height: 32, borderRadius: 8, border: '1px solid', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.4s ease', position: 'relative',
  },
  nodeIconPulse: {
    position: 'absolute', inset: -1, borderRadius: 8, border: '1px solid rgba(62,207,142,0.5)',
    animation: 'ringGrow 1.4s ease-out infinite',
  },
  nodeLabel: { fontSize: 13.5, fontWeight: 600, transition: 'color 0.4s ease' },
  nodeSub: { fontSize: 11, color: '#4a4a4a', fontFamily: "'JetBrains Mono', monospace", marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pulseRing: { position: 'absolute', right: 14, width: 6, height: 6, borderRadius: '50%', background: '#3ecf8e', boxShadow: '0 0 0 4px rgba(62,207,142,0.15)' },
  scanLine: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '35%',
    background: 'linear-gradient(90deg, transparent, rgba(62,207,142,0.09), transparent)',
    animation: 'scan 1.8s linear infinite', pointerEvents: 'none',
  },
  connector: { width: 2, height: 18, background: '#161616', marginLeft: 24, position: 'relative', overflow: 'visible' },
  connectorFill: { position: 'absolute', top: 0, left: 0, width: '100%', background: '#3ecf8e', transition: 'height 0.5s ease' },
  connectorPacket: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%',
    background: '#c9ffe6', boxShadow: '0 0 6px 2px rgba(62,207,142,0.7)', animation: 'packetTravel 1.4s ease-in-out infinite',
  },

  diagramFoot: { marginTop: 18, paddingTop: 14, borderTop: '1px solid #161616', position: 'relative' },
  footMetric: { fontSize: 11, color: '#454545', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 },
  footDot: { width: 5, height: 5, borderRadius: '50%', background: '#2d2d2d' },

  stackSection: { position: 'relative', zIndex: 2, padding: '0 56px 72px' },
  stackPanel: {
    position: 'relative', maxWidth: 1040, margin: '0 auto', background: '#0a0b0c',
    border: '1px solid #171717', borderRadius: 18, padding: '36px 0 40px', overflow: 'hidden',
    boxShadow: '0 40px 80px -40px rgba(0,0,0,0.7)',
  },
  stackTopLine: {
    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(62,207,142,0.6), transparent)',
  },
  stackHeadRow: { textAlign: 'center', padding: '0 24px', marginBottom: 32 },
  stackKicker: {
    fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ecf8e',
    fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 10,
  },
  stackHeading: { fontSize: 24, fontWeight: 700, color: '#f5f5f5', margin: 0, letterSpacing: '-0.4px' },

  stackItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 88 },
  stackBadge: {
    width: 64, height: 64, borderRadius: 14, background: '#111214', border: '1px solid #1e1f21',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s ease',
  },
  stackImg: { display: 'block', objectFit: 'contain' },
  stackFallbackText: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.02em',
  },
  stackName: {
    fontSize: 11, color: '#5a5a5a', fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', whiteSpace: 'nowrap',
  },
};

export default Login;