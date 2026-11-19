import { useEffect, useRef, useState } from 'react';
import { impact } from '../data/content';
import { profile } from '../data/profile';
import { prefersReducedMotion, useCountUp, useInView, useScramble } from './hooks';

/** A field of dots that bends away from the pointer and ripples on click. */
function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = prefersReducedMotion();
    const gap = 28;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const ripples: { x: number; y: number; t: number }[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(0);
    };

    const draw = (time: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      ctx.clearRect(0, 0, width, height);
      for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t > 2200) ripples.splice(i, 1);

      for (let gx = gap / 2; gx < width; gx += gap) {
        for (let gy = gap / 2; gy < height; gy += gap) {
          let x = gx;
          let y = gy + (reduce ? 0 : Math.sin(gx * 0.011 + time * 0.0008) * 3 + Math.cos(gy * 0.013 - time * 0.0006) * 3);
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          const force = Math.max(0, 1 - dist / 220);
          x += (dx / dist) * force * force * 26;
          y += (dy / dist) * force * force * 26;

          let wave = 0;
          for (const ripple of ripples) {
            const age = time - ripple.t;
            const radius = age * 0.5;
            const rd = Math.hypot(gx - ripple.x, gy - ripple.y) || 1;
            const band = Math.exp(-((rd - radius) ** 2) / 900) * (1 - age / 2200);
            wave += band;
            x += ((gx - ripple.x) / rd) * band * 12;
            y += ((gy - ripple.y) / rd) * band * 12;
          }

          // Fade the field toward the bottom so the stats stay readable.
          const fade = Math.min(1, Math.max(0, 1.15 - gy / height));
          const energy = Math.min(1, force + wave);
          const alpha = (0.2 + energy * 0.8) * fade;
          ctx.fillStyle = energy > 0.05 ? `rgba(${Math.round(150 + 48 * energy)}, ${Math.round(220 + 23 * energy)}, ${Math.round(180 - 73 * energy)}, ${alpha})` : `rgba(150, 200, 175, ${alpha})`;
          const size = 1.5 + energy * 2.4;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = event.clientX - rect.left;
      pointer.ty = event.clientY - rect.top;
    };
    const onLeave = () => { pointer.tx = -9999; pointer.ty = -9999; };
    const onDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (event.clientY > rect.bottom) return;
      ripples.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, t: performance.now() });
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    });

    resize();
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={ref} className="fx-dots" aria-hidden="true" />;
}

const ROLES = ['web apps', 'mobile apps', 'banking platforms', 'Node.js APIs', 'developer tools', 'games, for fun'];

/** Types and deletes each phrase in turn. */
function RotatingRole() {
  const [text, setText] = useState(ROLES[0]);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let index = 0;
    let chars = ROLES[0].length;
    let phase: 'hold' | 'delete' | 'type' = 'hold';
    let timer = 0;
    const step = () => {
      let delay = 35;
      if (phase === 'hold') {
        phase = 'delete';
      } else if (phase === 'delete') {
        chars -= 1;
        if (chars <= 0) { chars = 0; index = (index + 1) % ROLES.length; phase = 'type'; }
      } else {
        chars += 1;
        delay = 65;
        if (chars >= ROLES[index].length) { phase = 'hold'; delay = 2200; }
      }
      setText(ROLES[index].slice(0, chars));
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(step, 2600);
    return () => clearTimeout(timer);
  }, []);
  return <span className="fx-typed" aria-hidden="true">{text}<span className="fx-caret" /></span>;
}

function BangkokClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  return <time className="fx-mono" dateTime={now.toISOString()}>{time} ICT</time>;
}

function Stat({ item, active, index }: { item: (typeof impact)[number]; active: boolean; index: number }) {
  const value = useCountUp(item.value, active, 1400 + index * 300);
  return (
    <div className="fx-stat">
      <dt>{item.label}</dt>
      <dd>
        <span aria-hidden="true">{value.toLocaleString('en-US')}{item.suffix}<small>{item.unit}</small></span>
        <span className="sr-only">{item.display}</span>
      </dd>
    </div>
  );
}

export function Hero() {
  const first = useScramble('Phurin', { delay: 250 });
  const last = useScramble('Taengsriwan', { delay: 520 });
  const statsRef = useRef<HTMLDListElement>(null);
  const statsIn = useInView(statsRef);

  return (
    <section id="top" className="fx-hero" aria-labelledby="fx-hero-title">
      <DotField />
      <div className="fx-hero-glow" aria-hidden="true" />
      <div className="fx-wrap fx-hero-inner">
        <div className="fx-status">
          <span className="fx-pulse" aria-hidden="true" />
          <span>Frontend &amp; mobile engineer</span>
          <span className="fx-dot-sep" aria-hidden="true">/</span>
          <span>Bangkok, Thailand</span>
          <span className="fx-dot-sep" aria-hidden="true">/</span>
          <BangkokClock />
        </div>

        <h1 id="fx-hero-title" className="fx-name" aria-label={profile.name}>
          <span aria-hidden="true" className="fx-name-line">{first}</span>
          <span aria-hidden="true" className="fx-name-line fx-name-outline">{last}<em>.</em></span>
        </h1>

        <div className="fx-hero-bottom">
          <p className="fx-lede">
            I build <span className="sr-only">production web and mobile apps</span><RotatingRole />
            <br />
            <span className="fx-serif">with React, TypeScript, Flutter &amp; Kotlin</span> — and the Node.js APIs and tools that help teams ship.
          </p>
          <div className="fx-hero-actions">
            <a className="fx-btn fx-btn-primary" href="#work"><span>See the work</span><span aria-hidden="true">↓</span></a>
            <a className="fx-btn fx-btn-ghost" href={profile.resume} target="_blank" rel="noreferrer">Résumé ↗</a>
          </div>
        </div>

        <dl className="fx-stats" ref={statsRef}>
          {impact.map((item, index) => <Stat key={item.label} item={item} active={statsIn} index={index} />)}
        </dl>
        <p className="fx-hint" aria-hidden="true">move · click the dots</p>
      </div>
    </section>
  );
}
