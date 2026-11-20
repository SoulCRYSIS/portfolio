import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { aiCases, aiIntro, aiPrinciples, currentRole, earlierRoles, simsHighlights, simsScreens, skills } from '../data/content';
import { profile } from '../data/profile';
import { finePointer, prefersReducedMotion, useMagnetic, useSpotlight } from './hooks';

const asset = (file: string) => `${import.meta.env.BASE_URL}assets/${file}`;

export function SectionHeading({ index, kicker, title, children }: { index: string; kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="fx-heading" data-reveal>
      <p className="fx-kicker"><span className="fx-mono">{index}</span>{kicker}</p>
      <h2>{title}</h2>
      {children && <p className="fx-heading-note">{children}</p>}
    </header>
  );
}

const STACK = ['React', 'Next.js', 'TypeScript', 'Flutter', 'Dart', 'Kotlin', 'Bloc', 'Node.js', 'Fastify', 'Firebase', 'Firestore', 'Algolia', 'PostgreSQL', 'Jenkins', 'Sonar', 'Melos', 'Claude Code', 'Cursor', 'MCP', 'Lua', 'Godot'];

export function Marquee() {
  const row = STACK.map(item => <li key={item}>{item}<span aria-hidden="true">✦</span></li>);
  return (
    <div className="fx-marquee" aria-label="Technologies I work with">
      <ul className="fx-marquee-track">{row}</ul>
      <ul className="fx-marquee-track" aria-hidden="true">{row}</ul>
    </div>
  );
}

/* ── SIMS case study ─────────────────────────────────────────── */

const FLOATING_NOTES = [
  { label: 'Fastify API', sub: 'on Cloud Functions', className: 'fx-note-a' },
  { label: 'ค้นหาภาษาไทย', sub: 'Algolia partial matching', className: 'fx-note-b' },
  { label: '500+ staff', sub: 'used the original app', className: 'fx-note-c' },
];

export function CaseStudy() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = prefersReducedMotion();

  const tilt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || reduce || !finePointer()) return;
    const rect = stage.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    stage.style.setProperty('--px', px.toFixed(3));
    stage.style.setProperty('--py', py.toFixed(3));
  };
  const resetTilt = () => {
    stageRef.current?.style.removeProperty('--px');
    stageRef.current?.style.removeProperty('--py');
    setPaused(false);
  };

  return (
    <section id="work" className="fx-section fx-case" aria-labelledby="fx-case-title">
      <div className="fx-wrap">
        <SectionHeading index="01" kicker="Featured case study" title={<span id="fx-case-title">SIMS <span className="fx-serif">Property</span></span>}>
          Freelance developer · 2023–2024, 2026
        </SectionHeading>
        <div className="fx-case-grid">
          <div className="fx-case-copy" data-reveal>
            <p className="fx-case-lead">I started from scratch by <mark>visiting the client on site</mark> — watching how valuation and accounting staff handled jobs, turning those workflows into requirements, and refining the app with their feedback.</p>
            <p>The original Flutter app was used by 500+ employees. I returned in 2026 to migrate the workspace to React and TypeScript with Claude Code.</p>
            <ol className="fx-spec">
              {simsHighlights.map((item, index) => <li key={item}><span className="fx-mono">0{index + 1}</span>{item}</li>)}
            </ol>
          </div>

          <figure className="fx-stage" ref={stageRef} onPointerMove={tilt} onPointerEnter={() => setPaused(true)} onPointerLeave={resetTilt} data-reveal>
            <div className="fx-browser">
              <div className="fx-browser-bar" aria-hidden="true">
                <span /><span /><span />
                <p className="fx-mono">workspace.simsproperty / {simsScreens[active].title.toLowerCase().replace(/\s+/g, '-')}</p>
              </div>
              <div className="fx-browser-view">
                {simsScreens.map((screen, index) => (
                  <img key={screen.file} src={asset(screen.file)} alt={index === active ? screen.alt : ''} aria-hidden={index !== active} className={index === active ? 'is-active' : undefined} loading="lazy" decoding="async" />
                ))}
              </div>
            </div>
            {FLOATING_NOTES.map(note => (
              <div key={note.label} className={`fx-note ${note.className}`} aria-hidden="true"><strong>{note.label}</strong><span>{note.sub}</span></div>
            ))}
            <div className="fx-tabs" role="group" aria-label="Choose a SIMS screenshot" onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
              {simsScreens.map((screen, index) => (
                <button key={screen.file} type="button" aria-pressed={index === active} onClick={() => setActive(index)}>
                  {screen.title}
                  {index === active && !reduce && (
                    <span className="fx-tab-progress" style={{ animationPlayState: paused ? 'paused' : 'running' } as CSSProperties} onAnimationEnd={() => setActive((active + 1) % simsScreens.length)} />
                  )}
                </button>
              ))}
            </div>
            <figcaption aria-live="polite">{simsScreens[active].description}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ── Experience timeline ─────────────────────────────────────── */

export function Timeline() {
  const listRef = useRef<HTMLOListElement>(null);
  const spotlightRef = useSpotlight<HTMLDivElement>('.fx-glow-card');

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = list.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - rect.top) / rect.height));
      list.style.setProperty('--progress', progress.toFixed(4));
      list.querySelectorAll<HTMLElement>('.fx-tl-item').forEach(item => {
        item.classList.toggle('is-lit', item.getBoundingClientRect().top < window.innerHeight * 0.6);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section id="experience" className="fx-section" aria-labelledby="fx-exp-title">
      <div className="fx-wrap" ref={spotlightRef}>
        <SectionHeading index="02" kicker="Experience" title={<span id="fx-exp-title">Where I’ve <span className="fx-serif">shipped</span></span>}>
          Banking, property valuation, and consumer apps.
        </SectionHeading>
        <ol className="fx-timeline" ref={listRef}>
          <li className="fx-tl-item fx-tl-current">
            <span className="fx-tl-node" aria-hidden="true" />
            <article className="fx-glow-card fx-current">
              <div className="fx-current-head">
                <div className="fx-logos">{currentRole.logos.map(logo => <img key={logo} src={logo} alt="" loading="lazy" />)}</div>
                <p className="fx-badge"><span className="fx-pulse" aria-hidden="true" />Now</p>
              </div>
              <p className="fx-mono fx-period">{currentRole.period}</p>
              <h3>{currentRole.company}</h3>
              <p className="fx-role">{currentRole.role}</p>
              <ul>{currentRole.details.map(item => <li key={item}>{item}</li>)}</ul>
            </article>
          </li>
          {earlierRoles.map(role => (
            <li className="fx-tl-item" key={role.company}>
              <span className="fx-tl-node" aria-hidden="true" />
              <article className="fx-glow-card">
                <div className="fx-tl-row">
                  <img className="fx-tl-logo" src={role.logo} alt="" loading="lazy" />
                  <p className="fx-mono fx-period">{role.period}</p>
                </div>
                <h3>{role.company}</h3>
                <p className="fx-role">{role.role}</p>
                <p>{role.description}</p>
                {role.caseStudy && <a className="fx-link" href="#work">Read the SIMS case study ↑</a>}
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── AI workflow ─────────────────────────────────────────────── */

export function AiWorkflow() {
  const ref = useSpotlight<HTMLDivElement>('.fx-glow-card');
  return (
    <section id="ai" className="fx-section" aria-labelledby="fx-ai-title">
      <div className="fx-wrap" ref={ref}>
        <SectionHeading index="03" kicker="AI-native workflow" title={<span id="fx-ai-title">Agents, <span className="fx-serif">on rails</span></span>}>
          {aiIntro}
        </SectionHeading>
        <div className="fx-ai-grid">
          {aiCases.map((item, index) => (
            <article key={item.title} className="fx-glow-card fx-ai-card" data-reveal>
              <p className="fx-mono fx-ai-where"><span>0{index + 1}</span>{item.where}</p>
              <h3>{item.title}</h3>
              <ol className="fx-ai-flow" aria-label={item.flow.join(' to ')}>
                {item.flow.map(step => <li key={step}>{step}</li>)}
              </ol>
              <p>{item.description}</p>
              <ul className="fx-ai-tools">{item.tools.map(tool => <li key={tool}>{tool}</li>)}</ul>
            </article>
          ))}
        </div>
        <div className="fx-ai-principles" data-reveal>
          <p className="fx-kicker">How I keep it reliable</p>
          <ol className="fx-spec">
            {aiPrinciples.map((item, index) => <li key={item}><span className="fx-mono">0{index + 1}</span>{item}</li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ── Skills & education ──────────────────────────────────────── */

export function Skills() {
  const ref = useSpotlight<HTMLDivElement>('.fx-glow-card');
  return (
    <section id="about" className="fx-section" aria-labelledby="fx-skills-title">
      <div className="fx-wrap" ref={ref}>
        <SectionHeading index="06" kicker="Toolbox" title={<span id="fx-skills-title">Skills &amp; <span className="fx-serif">background</span></span>} />
        <div className="fx-bento">
          {skills.map(([area, technologies]) => (
            <article key={area} className="fx-glow-card fx-skill" data-reveal>
              <h3>{area}</h3>
              <ul>{technologies.split(', ').map(tech => <li key={tech}>{tech}</li>)}</ul>
            </article>
          ))}
          <article className="fx-glow-card fx-edu" data-reveal>
            <p className="fx-kicker">Education</p>
            <h3>Chulalongkorn University</h3>
            <p>Computer Engineering, 2020–2024 · Second Class Honors · GPA 3.31</p>
          </article>
          <article className="fx-glow-card fx-lang" data-reveal>
            <p className="fx-kicker">Languages</p>
            <p className="fx-lang-big"><span lang="th">ไทย</span> <span className="fx-serif">&amp;</span> English</p>
            <p>Thai (native) · English (TOEIC 920/990)</p>
          </article>
          <article className="fx-glow-card fx-badges" data-reveal>
            <p className="fx-kicker">IBM digital badges</p>
            <p>Basics of Quantum Information and Fundamentals of Quantum Algorithms</p>
            <span className="fx-qubit" aria-hidden="true"><i /><i /><i /></span>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ── Contact ─────────────────────────────────────────────────── */

export function Contact({ onCopyEmail }: { onCopyEmail: () => void }) {
  const magnetRef = useMagnetic<HTMLButtonElement>(0.3);
  return (
    <section id="contact" className="fx-contact" aria-labelledby="fx-contact-title">
      <div className="fx-contact-marquee" aria-hidden="true">
        <span>Let’s build something good ✦ Let’s build something good ✦ </span>
        <span>Let’s build something good ✦ Let’s build something good ✦ </span>
      </div>
      <div className="fx-wrap fx-contact-inner">
        <h2 id="fx-contact-title" data-reveal>Got a product that needs <span className="fx-serif">shipping?</span></h2>
        <div className="fx-contact-actions" data-reveal>
          <button ref={magnetRef} type="button" className="fx-email" onClick={onCopyEmail}>
            <span className="fx-email-label">Copy email</span>
            <span className="fx-email-address">{profile.email}</span>
          </button>
          <div className="fx-contact-links">
            <a href={`mailto:${profile.email}`}>Email ↗</a>
            <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>
            <a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href={profile.resume} download="Phurin-Taengsriwan-Resume.pdf">Résumé ↓</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="fx-wrap fx-footer">
      <span>© {new Date().getFullYear()} {profile.name}</span>
      <span className="fx-mono">React · TypeScript · Canvas · no UI libraries</span>
      <a href={`${profile.github}/portfolio`} target="_blank" rel="noreferrer">Site source ↗</a>
      <a href="#top">Back to top ↑</a>
    </footer>
  );
}
