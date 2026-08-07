import React, { useState, useEffect, useMemo, useRef } from "react";
import LogoLoop from "./components/LogoLoop/LogoLoop";


const ICON = (slug, color) =>
  `https://cdn.simpleicons.org/${slug}${color ? `/${color}` : ""}`;

const STACK = [
  { name: "GitHub", slug: "github" },
  { name: "GitHub Actions", slug: "githubactions" },
  { name: "Docker", slug: "docker" },
  { name: "Kubernetes", slug: "kubernetes" },
  { name: "Nginx", slug: "nginx" },
  { name: "Redis", slug: "redis" },
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "Node.js", slug: "nodedotjs" },
  { name: "React", slug: "react" },
  { name: "Amazon AWS", slug: "amazonwebservices" },
];

function StackIcon({ name, slug, size = 30 }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="vc-stackBadge">
      {failed ? (
        <span className="vc-stackFallback">
          {name.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <img
          src={ICON(slug, "b4b4b4")}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="vc-stackImg"
        />
      )}
    </div>
  );
}

// ---------- the exact 5-step deployment flow ----------
const STEPS = [
  {
    key: "push",
    num: "01",
    label: "Git Push",
    desc: "Commit lands on main, webhook fires",
    slug: "github",
  },
  {
    key: "ci",
    num: "02",
    label: "CI Pipeline",
    desc: "Lint, test, typecheck via Actions",
    slug: "githubactions",
  },
  {
    key: "build",
    num: "03",
    label: "Docker Build",
    desc: "Image built, tagged, pushed",
    slug: "docker",
  },
  {
    key: "deploy",
    num: "04",
    label: "K8s Rollout",
    desc: "Pods roll out, zero downtime",
    slug: "kubernetes",
  },
  {
    key: "edge",
    num: "05",
    label: "Live on Edge",
    desc: "Nginx routes global traffic",
    slug: "nginx",
  },
];

// Preload step icons once as data so <img> never refetches per re-render.
function useStepIconSrc(slug, lit) {
  return useMemo(() => ICON(slug, lit ? "3ecf8e" : "525252"), [slug, lit]);
}

function StepIcon({ slug, lit }) {
  const src = useStepIconSrc(slug, lit);
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="vc-nodeIconFallback">•</span>;
  return (
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      loading="eager"
      decoding="async"
      style={{ opacity: lit ? 1 : 0.55 }}
      onError={() => setFailed(true)}
    />
  );
}

function Login({ onGitHubLogin }) {
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rootRef = useRef(null);

  const STACK_LOGOS = useMemo(
    () =>
      STACK.map((item) => ({
        node: (
          <div className="vc-stackItem" key={item.slug}>
            <StackIcon name={item.name} slug={item.slug} />
            <span className="vc-stackName">{item.name}</span>
          </div>
        ),
        ariaLabel: item.name,
      })),
    [],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e) => setReduceMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Pause the pipeline interval when the section isn't visible (tab hidden,
  // scrolled away) — this was the main source of "laggy" CPU usage, since a
  // 1.6s interval kept forcing style recalculation on a heavy DOM tree even
  // off-screen.
  useEffect(() => {
    if (reduceMotion) return;
    let visible = true;
    const node = rootRef.current;
    const io = node
      ? new IntersectionObserver(
          ([entry]) => (visible = entry.isIntersecting),
          {
            threshold: 0.1,
          },
        )
      : null;
    if (node && io) io.observe(node);

    const onVis = () => {
      visible = visible && document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);

    const interval = setInterval(() => {
      if (!visible || document.visibilityState !== "visible") return;
      setActive((prev) => (prev + 1) % STEPS.length);
    }, 1800);

    return () => {
      clearInterval(interval);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduceMotion]);

  return (
    <div className="vc-page" ref={rootRef}>
      <div className="vc-bgGrid" />
      <div className="vc-bgOrb vc-bgOrb--a" />
      <div className="vc-bgOrb vc-bgOrb--b" />
      <div className="vc-bgVignette" />

      {/* ---------- NAV ---------- */}
      <nav className="vc-nav">
        <div className="vc-logoRow">
          <div className="vc-logoIcon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#08090a"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="vc-logoText">VeloCore</span>
        </div>
        <div className="vc-navLinks">
          <span className="vc-navLink">Docs</span>
          <span className="vc-navLink">GitHub</span>
        </div>
      </nav>

      {/* ---------- HERO SPLIT ---------- */}
      <div className="vc-hero">
        <div className="vc-left">
          <div className="vc-eyebrow">
            <span className="vc-eyebrowDot" />
            now deploying on edge infrastructure
          </div>

          <h1 className="vc-heading">
            Ship code.
            <br />
            <span className="vc-headingMuted">Not infrastructure.</span>
          </h1>

          <p className="vc-sub">
            VeloCore turns a git push into a live deployment — isolated builds,
            global edge delivery, and real-time observability, without touching
            a server.
          </p>

          <div className="vc-ctaRow">
            <button onClick={onGitHubLogin} className="vc-ghBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#08090a">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
            <span className="vc-ctaNote">
              Read-only access · No code stored
            </span>
          </div>

          <div className="vc-statRow">
            <div className="vc-statBlock">
              <div className="vc-statNum">38s</div>
              <div className="vc-statLabel">avg build time</div>
            </div>
            <div className="vc-statDivider" />
            <div className="vc-statBlock">
              <div className="vc-statNum">99.9%</div>
              <div className="vc-statLabel">uptime SLA</div>
            </div>
            <div className="vc-statDivider" />
            <div className="vc-statBlock">
              <div className="vc-statNum">0</div>
              <div className="vc-statLabel">servers managed</div>
            </div>
          </div>
        </div>

        {/* RIGHT: precise 5-step pipeline (kept + enhanced) */}
        <div className="vc-right">
          <div className="vc-diagramCard">
            <span className="vc-hudCorner vc-hudCorner--tl" />
            <span className="vc-hudCorner vc-hudCorner--tr" />
            <span className="vc-hudCorner vc-hudCorner--bl" />
            <span className="vc-hudCorner vc-hudCorner--br" />
            <div className="vc-diagramGlow" />

            <div className="vc-diagramHead">
              <span className="vc-diagramTitle">deployment pipeline</span>
              <span className="vc-diagramBadge">
                <span className="vc-liveDot" />
                live
              </span>
            </div>

            <div className="vc-commitLine">
              <span className="vc-prompt">$</span> git push origin main
              <span className="vc-caret">▍</span>
            </div>

            <div className="vc-pipeline">
              {STEPS.map((step, i) => {
                const isActive = i === active;
                const isPast = i < active;
                const lit = isActive || isPast;
                return (
                  <React.Fragment key={step.key}>
                    <div
                      className={`vc-node${isActive ? " is-active" : ""}${isPast ? " is-past" : ""}`}
                    >
                      <span className="vc-stepNum">{step.num}</span>

                      <div className="vc-nodeIconWrap">
                        {isActive && <span className="vc-nodeIconPulse" />}
                        <StepIcon slug={step.slug} lit={lit} />
                      </div>

                      <div className="vc-nodeText">
                        <div className="vc-nodeLabel">{step.label}</div>
                        <div className="vc-nodeSub">{step.desc}</div>
                      </div>

                      {isPast && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#3ecf8e"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {isActive && <div className="vc-pulseRing" />}
                      {isActive && <div className="vc-scanLine" />}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="vc-connector">
                        <div
                          className={`vc-connectorFill${isPast || isActive ? " is-filled" : ""}`}
                        />
                        {(isPast || isActive) && (
                          <div className="vc-connectorPacket" />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="vc-diagramFoot">
              <div className="vc-footMetric">
                <span className="vc-footDot" />
                prometheus + loki: scraping live metrics
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- STACK LOGO LOOP ---------- */}
      <div className="vc-stackSection">
        <div className="vc-stackPanel">
          <span className="vc-stackTopLine" />
          <div className="vc-stackHeadRow">
            <span className="vc-stackKicker">infrastructure</span>
            <h3 className="vc-stackHeading">The stack behind every deploy</h3>
          </div>
          <LogoLoop
            logos={STACK_LOGOS}
            speed={reduceMotion ? 0 : 42}
            direction="left"
            gap={56}
            pauseOnHover
            scaleOnHover
            fadeOut
            fadeOutColor="#0a0b0c"
            ariaLabel="Technologies used by VeloCore"
          />
        </div>
      </div>

      <style>{`
        :root {
          --vc-accent: #3ecf8e;
          --vc-bg: #050506;
          --vc-panel: #0b0b0c;
          --vc-line: #171717;
        }

        * { box-sizing: border-box; }

        .vc-page {
          min-height: 100vh;
          width: 100%;
          background: var(--vc-bg);
          position: relative;
          overflow-x: hidden;
          font-family: 'Inter', system-ui, sans-serif;
          isolation: isolate;
        }

        /* ---- ambient backdrop (cheap: no blur() on mobile, gradients only) ---- */
        .vc-bgGrid {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, black 0%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, black 0%, transparent 75%);
        }
        .vc-bgOrb {
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          opacity: 0.5;
          will-change: transform;
        }
        .vc-bgOrb--a {
          top: -10%;
          left: 8%;
          background: radial-gradient(circle, rgba(62,207,142,0.16) 0%, transparent 70%);
          animation: orbFloat 14s ease-in-out infinite;
        }
        .vc-bgOrb--b {
          top: 28%;
          right: 2%;
          background: radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%);
          animation: orbFloat 14s ease-in-out infinite 3s reverse;
        }
        .vc-bgVignette {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(ellipse 90% 60% at 50% 0%, transparent 40%, var(--vc-bg) 100%);
        }

        .vc-nav {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #141414;
        }
        .vc-logoRow { display: flex; align-items: center; gap: 9px; }
        .vc-logoIcon {
          width: 25px; height: 25px;
          background: linear-gradient(155deg, #fdfdfd, #c9c9c9);
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .vc-logoText {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px; font-weight: 500; color: #e4e4e4;
        }
        .vc-navLinks { display: flex; gap: 22px; }
        .vc-navLink { font-size: 13px; color: #666; cursor: pointer; }

        .vc-hero {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          min-height: calc(100vh - 66px);
          padding: 40px 24px;
          gap: 48px;
          max-width: 1280px;
          margin: 0 auto;
          flex-wrap: wrap;
        }
        .vc-left {
          flex: 1 1 440px;
          max-width: 560px;
          animation: fadeSlideUp 0.6s ease both;
        }
        .vc-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--vc-accent);
          font-family: 'JetBrains Mono', monospace;
          background: rgba(62,207,142,0.07);
          border: 1px solid rgba(62,207,142,0.2);
          padding: 6px 12px;
          border-radius: 20px;
          margin-bottom: 24px;
        }
        .vc-eyebrowDot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--vc-accent);
          animation: pulseGlow 1.8s ease-in-out infinite;
        }
        .vc-heading {
          font-size: clamp(34px, 6vw, 58px);
          font-weight: 700;
          color: #fafafa;
          line-height: 1.08;
          letter-spacing: -1.3px;
          margin: 0 0 20px;
        }
        .vc-headingMuted { color: #54545a; }
        .vc-sub {
          font-size: clamp(14.5px, 2vw, 16.5px);
          color: #8a8a8a;
          line-height: 1.65;
          max-width: 460px;
          margin: 0 0 32px;
        }

        .vc-ctaRow {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .vc-ghBtn {
          padding: 14px 24px;
          background: #fafafa;
          color: #08090a;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .vc-ghBtn:hover { background: #d4d4d4; }
        .vc-ghBtn:active { transform: scale(0.98); }
        .vc-ctaNote {
          font-size: 12px; color: #454545;
          font-family: 'JetBrains Mono', monospace;
        }

        .vc-statRow {
          display: flex;
          align-items: center;
          gap: 24px;
          padding-top: 28px;
          border-top: 1px solid #161616;
          flex-wrap: wrap;
        }
        .vc-statNum {
          font-size: 22px; font-weight: 700; color: #e4e4e4; letter-spacing: -0.4px;
        }
        .vc-statLabel {
          font-size: 11.5px; color: #4a4a4a; margin-top: 2px;
          font-family: 'JetBrains Mono', monospace;
        }
        .vc-statDivider { width: 1px; height: 30px; background: #1a1a1a; }

        .vc-right {
          flex: 1 1 380px;
          display: flex;
          justify-content: center;
          max-width: 460px;
          animation: fadeSlideUp 0.6s ease 0.12s both;
        }
        .vc-diagramCard {
          width: 100%;
          background: var(--vc-panel);
          border: 1px solid var(--vc-line);
          border-radius: 14px;
          padding: 22px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 30px 60px -30px rgba(0,0,0,0.6);
        }
        .vc-hudCorner {
          position: absolute;
          width: 16px; height: 16px;
          border: 1.5px solid rgba(62,207,142,0.4);
          border-radius: 3px;
          z-index: 1;
        }
        .vc-hudCorner--tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
        .vc-hudCorner--tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
        .vc-hudCorner--bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
        .vc-hudCorner--br { bottom: -1px; right: -1px; border-left: none; border-top: none; }

        .vc-diagramGlow {
          position: absolute;
          top: -60px; right: -60px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(62,207,142,0.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .vc-diagramHead {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px; position: relative;
        }
        .vc-diagramTitle {
          font-size: 11px; color: #525252;
          font-family: 'JetBrains Mono', monospace;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .vc-diagramBadge {
          font-size: 11px; color: var(--vc-accent);
          font-family: 'JetBrains Mono', monospace;
          display: flex; align-items: center; gap: 6px;
          text-transform: uppercase;
        }
        .vc-liveDot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--vc-accent);
          animation: pulseGlow 1.6s ease-in-out infinite;
        }

        .vc-commitLine {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; color: #8a8a8a;
          background: #050505;
          border: 1px solid var(--vc-line);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 18px;
          display: flex; gap: 8px; align-items: center;
        }
        .vc-prompt { color: var(--vc-accent); }
        .vc-caret {
          color: var(--vc-accent);
          animation: blinkCaret 1s step-start infinite;
          margin-left: 2px;
        }

        .vc-pipeline { display: flex; flex-direction: column; position: relative; }
        .vc-node {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 13px;
          border-radius: 10px;
          border: 1px solid #161616;
          background: #0c0c0d;
          position: relative;
          overflow: hidden;
          transition: border-color 0.35s ease, background 0.35s ease, box-shadow 0.35s ease;
        }
        .vc-node.is-past { border-color: rgba(62,207,142,0.25); }
        .vc-node.is-active {
          border-color: var(--vc-accent);
          background: rgba(62,207,142,0.07);
          box-shadow: 0 0 0 1px rgba(62,207,142,0.18), 0 10px 26px -10px rgba(62,207,142,0.4);
        }
        .vc-stepNum {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 700; width: 15px; flex-shrink: 0;
          color: #3a3a3a;
          transition: color 0.35s ease;
        }
        .vc-node.is-past .vc-stepNum { color: rgba(62,207,142,0.55); }
        .vc-node.is-active .vc-stepNum { color: var(--vc-accent); }

        .vc-nodeIconWrap {
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid #1f1f1f;
          background: #111;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative;
          transition: border-color 0.35s ease, background 0.35s ease;
        }
        .vc-node.is-active .vc-nodeIconWrap,
        .vc-node.is-past .vc-nodeIconWrap { border-color: var(--vc-accent); background: rgba(62,207,142,0.12); }
        .vc-nodeIconFallback { color: #666; font-size: 10px; }
        .vc-nodeIconPulse {
          position: absolute; inset: -1px; border-radius: 8px;
          border: 1px solid rgba(62,207,142,0.5);
          animation: ringGrow 1.4s ease-out infinite;
        }
        .vc-nodeText { flex: 1; min-width: 0; }
        .vc-nodeLabel {
          font-size: 13px; font-weight: 600; color: #767676;
          transition: color 0.35s ease;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vc-node.is-past .vc-nodeLabel { color: #c4c4c4; }
        .vc-node.is-active .vc-nodeLabel { color: #f5f5f5; }
        .vc-nodeSub {
          font-size: 10.5px; color: #4a4a4a;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vc-pulseRing {
          flex-shrink: 0;
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--vc-accent);
          box-shadow: 0 0 0 4px rgba(62,207,142,0.15);
        }
        .vc-scanLine {
          position: absolute; top: 0; left: 0; bottom: 0; width: 35%;
          background: linear-gradient(90deg, transparent, rgba(62,207,142,0.09), transparent);
          animation: scan 1.8s linear infinite;
          pointer-events: none;
        }
        .vc-connector {
          width: 2px; height: 16px;
          background: #161616;
          margin-left: 22px;
          position: relative;
        }
        .vc-connectorFill {
          position: absolute; top: 0; left: 0; width: 100%; height: 0%;
          background: var(--vc-accent);
          transition: height 0.5s ease;
        }
        .vc-connectorFill.is-filled { height: 100%; }
        .vc-connectorPacket {
          position: absolute; left: 50%; transform: translateX(-50%);
          width: 5px; height: 5px; border-radius: 50%;
          background: #c9ffe6;
          box-shadow: 0 0 6px 2px rgba(62,207,142,0.7);
          animation: packetTravel 1.4s ease-in-out infinite;
        }

        .vc-diagramFoot {
          margin-top: 16px; padding-top: 13px;
          border-top: 1px solid #161616;
        }
        .vc-footMetric {
          font-size: 10.5px; color: #454545;
          font-family: 'JetBrains Mono', monospace;
          display: flex; align-items: center; gap: 6px;
        }
        .vc-footDot { width: 5px; height: 5px; border-radius: 50%; background: #2d2d2d; }

        .vc-stackSection { position: relative; z-index: 2; padding: 0 24px 56px; }
        .vc-stackPanel {
          position: relative;
          max-width: 1040px;
          margin: 0 auto;
          background: #0a0b0c;
          border: 1px solid var(--vc-line);
          border-radius: 18px;
          padding: 32px 0 36px;
          overflow: hidden;
          box-shadow: 0 40px 80px -40px rgba(0,0,0,0.7);
        }
        .vc-stackTopLine {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 60%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(62,207,142,0.6), transparent);
        }
        .vc-stackHeadRow { text-align: center; padding: 0 20px; margin-bottom: 28px; }
        .vc-stackKicker {
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--vc-accent);
          font-family: 'JetBrains Mono', monospace;
          display: block; margin-bottom: 8px;
        }
        .vc-stackHeading {
          font-size: clamp(19px, 3vw, 24px); font-weight: 700; color: #f5f5f5;
          margin: 0; letter-spacing: -0.3px;
        }

        .vc-stackItem { display: flex; flex-direction: column; align-items: center; gap: 9px; width: 82px; }
        .vc-stackBadge {
          width: 58px; height: 58px; border-radius: 14px;
          background: #111214; border: 1px solid #1e1f21;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .vc-stackImg { display: block; object-fit: contain; }
        .vc-stackFallback {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; font-weight: 700; color: #666; letter-spacing: 0.02em;
        }
        .vc-stackName {
          font-size: 10.5px; color: #5a5a5a;
          font-family: 'JetBrains Mono', monospace;
          text-align: center; white-space: nowrap;
        }

        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes ringGrow { 0% { box-shadow: 0 0 0 0 rgba(62,207,142,0.35); } 100% { box-shadow: 0 0 0 8px rgba(62,207,142,0); } }
        @keyframes packetTravel { 0% { top: -6px; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
        @keyframes orbFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -14px); } }
        @keyframes blinkCaret { 50% { opacity: 0; } }

        /* ---------------- Mobile ---------------- */
        @media (max-width: 900px) {
          .vc-hero { padding: 28px 18px; gap: 36px; }
          .vc-left, .vc-right { flex-basis: 100%; max-width: 100%; }
          .vc-right { order: -1; max-width: 480px; margin: 0 auto; }
          .vc-statRow { gap: 18px; }
        }
        @media (max-width: 480px) {
          .vc-nav { padding: 16px 16px; }
          .vc-hero { padding: 22px 14px; }
          .vc-diagramCard { padding: 16px; }
          .vc-nodeSub { display: none; }
          .vc-ctaRow { flex-direction: column; align-items: flex-start; gap: 10px; }
          .vc-statRow { gap: 14px; }
          .vc-statDivider { height: 26px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .vc-eyebrowDot, .vc-liveDot, .vc-caret, .vc-nodeIconPulse,
          .vc-scanLine, .vc-connectorPacket, .vc-bgOrb--a, .vc-bgOrb--b,
          .vc-left, .vc-right {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Login;
