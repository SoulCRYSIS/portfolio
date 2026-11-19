import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './hooks';

/* ───────────────────────────────────────────────────────────────
   ASCII ocean drawn on a fixed canvas behind the fancy site:
   a shimmering water field, drifting jellyfish, fish schools that
   swim away from the cursor, an octopus, the odd whale, bubbles,
   and a seabed (seaweed + crab) that rises near the end of the page.
   ─────────────────────────────────────────────────────────────── */

type Sprite = { frames: string[][]; color: string; alpha: number };

const lines = (art: string) => art.replace(/^\n/, '').split('\n');

const JELLY: Sprite = {
  color: '200, 170, 255',
  alpha: 0.42,
  frames: [
    lines(`
  .-"""-.
 /  . .  \\
 \\_.-~-._/
  ( ( ( (
   ) ) ) )
  ( ( ( (
   ) ) )`),
    lines(`
  .-"""-.
 /  . .  \\
 \\_.-~-._/
   ) ) ) )
  ( ( ( (
   ) ) ) )
    ( ( (`),
  ],
};

const OCTOPUS: Sprite = {
  color: '255, 160, 140',
  alpha: 0.38,
  frames: [
    lines(`
    .---.
   ( o o )
   (  ~  )
   /|/|\\|\\
  / / | \\ \\
  \\ \\ | / /`),
    lines(`
    .---.
   ( o o )
   (  ~  )
   \\|\\|/|/
    \\ \\|/ /
   / / | \\ \\`),
  ],
};

const WHALE: Sprite = {
  color: '140, 200, 255',
  alpha: 0.32,
  frames: [
    lines(`
              .
             ":"
       .-''''''''''-.       _
     .'  o            '.__.' )
    <   ___              __ <
     '-'   '-.______.--''  '._)`),
    lines(`
             . .
             ":"
       .-''''''''''-.        _
     .'  o            '.__.-' )
    <   ___              __  <
     '-'   '-.______.--''   '-)`),
  ],
};

const FISH_RIGHT = ['><>', '><))°>', '><(((°>', '>=>'];
const FISH_LEFT = ['<><', '<°((><', '<°)))><', '<=<'];
const FISH_COLORS = ['200, 245, 106', '110, 231, 183', '255, 197, 107', '160, 220, 255'];

const CRAB = [['(\\/)(°,,,°)(\\/)'], ['(\\/) (°,,,°) (\\/)']];
const WATER = ['.', '-', '~', '≈'];

interface Drifter { kind: 'jelly' | 'octopus' | 'whale'; x: number; y: number; vx: number; vy: number; phase: number; ix: number; iy: number; spooked: number }
interface Ink { x: number; y: number; vx: number; vy: number; born: number; char: string }
interface Ripple { x: number; y: number; born: number }
interface Fish { x: number; y: number; vx: number; art: string; color: string; phase: number; flee: number }
interface Bubble { x: number; y: number; vy: number; phase: number; size: number }

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export function Ocean() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = prefersReducedMotion();
    const FONT_SIZE = 13;
    const LINE = 15;
    let charW = 7.8;
    let width = 0;
    let height = 0;
    let raf = 0;
    let lastFrame = 0;
    let lastScroll = window.scrollY;
    let whaleTimer = performance.now() + rand(8000, 16000);
    const pointer = { x: -9999, y: -9999 };

    const drifters: Drifter[] = [];
    const fish: Fish[] = [];
    const bubbles: Bubble[] = [];
    const ink: Ink[] = [];
    const ripples: Ripple[] = [];
    const SPRITE_SIZE = { jelly: [10, 7], octopus: [12, 6], whale: [30, 6] } as const;

    const setFont = () => {
      ctx.font = `${FONT_SIZE}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
      ctx.textBaseline = 'top';
      charW = ctx.measureText('M').width || 7.8;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setFont();
    };

    const small = () => width < 700;
    /** Creatures are dimmer on narrow screens, where they sit behind body text. */
    const dim = () => (small() ? 0.5 : 0.85);

    const spawnJelly = (anywhere = false) => drifters.push({
      kind: 'jelly', x: rand(0, width - 80), y: anywhere ? rand(0, height) : height + rand(20, 200),
      vx: rand(-0.08, 0.08), vy: -rand(0.12, 0.28), phase: rand(0, 10), ix: 0, iy: 0, spooked: 0,
    });
    const spawnOctopus = () => drifters.push({
      kind: 'octopus', x: rand(width * 0.55, width - 120), y: height + 60, vx: rand(-0.1, 0.05), vy: -rand(0.18, 0.3), phase: rand(0, 10), ix: 0, iy: 0, spooked: 0,
    });
    const spawnWhale = () => {
      const toLeft = true; // The art faces left.
      drifters.push({ kind: 'whale', x: toLeft ? width + 40 : -300, y: rand(height * 0.2, height * 0.65), vx: -rand(0.35, 0.5), vy: 0, phase: 0, ix: 0, iy: 0, spooked: 0 });
    };
    const spawnSchool = (anywhere = false) => {
      const right = Math.random() < 0.5;
      const color = pick(FISH_COLORS);
      const baseY = rand(height * 0.1, height * 0.9);
      const baseX = anywhere ? rand(0, width) : right ? -60 : width + 60;
      const speed = rand(0.5, 1.1) * (right ? 1 : -1);
      const count = Math.floor(rand(3, small() ? 5 : 8));
      for (let i = 0; i < count; i++) {
        const variant = Math.random() < 0.75 ? 0 : Math.floor(rand(1, FISH_RIGHT.length));
        fish.push({
          x: baseX - (right ? 1 : -1) * rand(0, 140), y: baseY + rand(-50, 50), vx: speed * rand(0.9, 1.1),
          art: right ? FISH_RIGHT[variant] : FISH_LEFT[variant], color, phase: rand(0, 10), flee: 0,
        });
      }
    };
    const spawnBubble = (x = rand(0, width), y = height + rand(0, 80)) => bubbles.push({
      x, y, vy: -rand(0.25, 0.7), phase: rand(0, 10), size: Math.random(),
    });

    const populate = () => {
      drifters.length = 0; fish.length = 0; bubbles.length = 0;
      for (let i = 0; i < (small() ? 1 : 4); i++) spawnJelly(true);
      for (let i = 0; i < (small() ? 1 : 2); i++) spawnSchool(true);
      for (let i = 0; i < 24; i++) spawnBubble(rand(0, width), rand(0, height));
    };

    const drawSprite = (sprite: Sprite, x: number, y: number, frame: number, fade = 1) => {
      const art = sprite.frames[frame % sprite.frames.length];
      ctx.fillStyle = `rgba(${sprite.color}, ${sprite.alpha * fade * dim()})`;
      art.forEach((row, i) => ctx.fillText(row, x, y + i * LINE));
    };

    /** Light rippling through water, as sparse ASCII characters. */
    const drawWater = (now: number, scroll: number) => {
      const t = now / 1000;
      const stepX = charW * 2;
      const stepY = LINE * 1.15;
      const rowShift = scroll * 0.004;
      for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].born > 2400) ripples.splice(i, 1);
      for (let row = 0; row * stepY < height; row++) {
        const y0 = row * stepY;
        const r = row + rowShift * 10;
        for (let col = 0; col * stepX < width; col++) {
          const x0 = col * stepX + (row % 2) * charW;
          let v = Math.sin(col * 0.16 + t * 0.6 + r * 0.05)
            + Math.sin(r * 0.27 - t * 0.45 + col * 0.04)
            + Math.sin((col - r) * 0.07 + t * 0.3);

          // The cursor lights up the water around it and pushes it aside.
          const dx = x0 - pointer.x;
          const dy = y0 - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          const force = Math.max(0, 1 - dist / 170);
          v += force * 2.2;
          let x = x0 + (dx / dist) * force * force * 22;
          let y = y0 + (dy / dist) * force * force * 22;

          // Click ripples travel outward as a bright ring.
          let ring = 0;
          for (const ripple of ripples) {
            const age = now - ripple.born;
            const rd = Math.hypot(x0 - ripple.x, y0 - ripple.y) || 1;
            const band = Math.exp(-((rd - age * 0.42) ** 2) / 700) * (1 - age / 2400);
            ring += band;
            x += ((x0 - ripple.x) / rd) * band * 10;
            y += ((y0 - ripple.y) / rd) * band * 10;
          }
          v += ring * 3;

          if (v < 1.25) continue;
          const level = Math.min(3, Math.floor((v - 1.25) * 2.2));
          // Brighter near the "surface" (top of the page), dimmer as you go deeper.
          const light = Math.max(0.25, 1 - scroll / 6000) * (0.5 + 0.5 * (1 - y0 / height));
          const glow = Math.min(1, force + ring);
          const alpha = (0.05 + level * 0.035) * light + glow * 0.32;
          ctx.fillStyle = glow > 0.05
            ? `rgba(${Math.round(150 + 50 * glow)}, ${Math.round(220 + 25 * glow)}, ${Math.round(200 - 90 * glow)}, ${alpha})`
            : `rgba(150, 220, 200, ${alpha})`;
          ctx.fillText(WATER[level], x, y);
        }
      }
    };

    /** Creatures within reach of the cursor get spooked and dart away. */
    const spook = (d: Drifter, now: number) => {
      const [cols, rows] = SPRITE_SIZE[d.kind];
      const cx = d.x + (cols * charW) / 2;
      const cy = d.y + (rows * LINE) / 2;
      const dx = cx - pointer.x;
      const dy = cy - pointer.y;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = d.kind === 'whale' ? 150 : 90;
      if (dist > reach || now < d.spooked) return;
      d.spooked = now + 900;
      const power = d.kind === 'whale' ? 1.2 : 3.5;
      d.ix += (dx / dist) * power;
      d.iy += (dy / dist) * power;
      if (d.kind === 'octopus') {
        for (let i = 0; i < 26; i++) {
          const angle = rand(0, Math.PI * 2);
          const speed = rand(0.2, 1.4);
          ink.push({ x: cx, y: cy, vx: Math.cos(angle) * speed - dx / dist * 0.4, vy: Math.sin(angle) * speed - dy / dist * 0.4, born: now, char: pick(['#', '%', '@', '*', '&']) });
        }
      }
      if (d.kind === 'jelly') for (let i = 0; i < 3; i++) spawnBubble(cx + rand(-10, 10), cy + rows * LINE * 0.6);
    };

    const drawSeabed = (t: number, rise: number) => {
      if (rise <= 0) return;
      const base = height - rise * LINE * 9.5;
      // Seaweed
      ctx.fillStyle = `rgba(110, 231, 183, ${0.3 * rise})`;
      const stalks = Math.floor(width / 90);
      for (let s = 0; s < stalks; s++) {
        const x0 = s * 90 + ((s * 37) % 50);
        const tall = 4 + ((s * 7) % 4);
        for (let i = 0; i < tall; i++) {
          const sway = Math.sin(t * 1.2 + s + i * 0.6) * (i * 0.9);
          ctx.fillText(i % 2 ? ')' : '(', x0 + sway, base + (7 - i) * LINE);
        }
      }
      // Sand
      ctx.fillStyle = `rgba(255, 210, 150, ${0.16 * rise})`;
      let sand = '';
      for (let i = 0; i < width / charW; i++) sand += (i * 7) % 5 === 0 ? '_' : (i * 3) % 7 === 0 ? ',' : '.';
      ctx.fillText(sand, 0, base + 8 * LINE);
      // Crab, scuttling back and forth
      const span = Math.max(1, width - 160);
      const pos = (Math.sin(t * 0.25) * 0.5 + 0.5) * span;
      ctx.fillStyle = `rgba(255, 140, 120, ${0.55 * rise})`;
      ctx.fillText(CRAB[Math.floor(t * 4) % 2][0], 40 + pos, base + 7 * LINE);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastFrame < 33) return; // ~30 fps is plenty for ASCII.
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;
      render(now, dt);
    };

    const render = (now: number, dt: number) => {
      const t = now / 1000;
      const scroll = window.scrollY;
      const scrollDelta = scroll - lastScroll;
      lastScroll = scroll;
      ctx.clearRect(0, 0, width, height);

      drawWater(now, scroll);

      // Swimming upward through the page: things drift up as you scroll down.
      const parallax = -scrollDelta * 0.3;
      const k = dt / 16;

      for (let i = drifters.length - 1; i >= 0; i--) {
        const d = drifters[i];
        spook(d, now);
        d.x += d.ix * k;
        d.y += d.iy * k;
        d.ix *= 0.94;
        d.iy *= 0.94;
        if (d.kind === 'jelly') {
          // Jellyfish pulse: quick push, slow glide.
          const pulse = Math.max(0, Math.sin(t * 1.6 + d.phase)) ** 3;
          d.y += (d.vy * (0.4 + pulse * 2.2)) * k + parallax;
          d.x += (d.vx + Math.sin(t * 0.4 + d.phase) * 0.06) * k;
          drawSprite(JELLY, d.x, d.y, Math.floor(t * 2 + d.phase));
        } else if (d.kind === 'octopus') {
          const pulse = Math.max(0, Math.sin(t * 2 + d.phase)) ** 2;
          d.y += d.vy * (0.3 + pulse * 2) * k + parallax;
          d.x += d.vx * k;
          drawSprite(OCTOPUS, d.x, d.y, Math.floor(t * 2.5));
        } else {
          d.x += d.vx * k;
          d.y += Math.sin(t * 0.5) * 0.08 * k + parallax * 0.5;
          drawSprite(WHALE, d.x, d.y, Math.floor(t * 1.5));
        }
        const gone = d.y < -160 || d.y > height + 400 || d.x < -420 || d.x > width + 420;
        if (gone) drifters.splice(i, 1);
      }

      for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i];
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) f.flee = Math.min(1, f.flee + 0.15);
        else f.flee *= 0.96;
        const away = dist > 0 ? dy / dist : 0;
        f.x += f.vx * (1 + f.flee * 3) * k;
        f.y += (Math.sin(t * 2 + f.phase) * 0.25 + away * f.flee * 2.5) * k + parallax * 0.6;
        ctx.fillStyle = `rgba(${f.color}, ${(0.45 + f.flee * 0.3) * dim()})`;
        ctx.fillText(f.art, f.x, f.y);
        if (f.x < -120 || f.x > width + 120 || f.y < -60 || f.y > height + 60) fish.splice(i, 1);
      }

      for (let i = ink.length - 1; i >= 0; i--) {
        const p = ink[i];
        const age = (now - p.born) / 2200;
        if (age >= 1) { ink.splice(i, 1); continue; }
        p.x += p.vx * k;
        p.y += p.vy * k + parallax;
        p.vx *= 0.96;
        p.vy *= 0.96;
        ctx.fillStyle = `rgba(150, 110, 200, ${0.45 * (1 - age)})`;
        ctx.fillText(p.char, p.x, p.y);
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += b.vy * k + parallax * 0.8;
        b.x += Math.sin(t * 2 + b.phase) * 0.3 * k;
        const char = b.size > 0.85 ? 'O' : b.size > 0.55 ? 'o' : b.size > 0.25 ? '°' : '.';
        ctx.fillStyle = `rgba(200, 240, 255, ${0.18 + b.size * 0.25})`;
        ctx.fillText(char, b.x, b.y);
        if (b.y < -20 || b.y > height + 120) bubbles.splice(i, 1);
      }

      // Keep the sea populated.
      const jellies = drifters.filter(d => d.kind === 'jelly').length;
      if (jellies < (small() ? 1 : 4) && Math.random() < 0.01) spawnJelly();
      if (!drifters.some(d => d.kind === 'octopus') && Math.random() < 0.0015) spawnOctopus();
      if (now > whaleTimer && !small()) { spawnWhale(); whaleTimer = now + rand(35000, 60000); }
      const schools = new Set(fish.map(f => f.color + Math.sign(f.vx))).size;
      if (schools < (small() ? 1 : 2) && Math.random() < 0.01) spawnSchool();
      if (bubbles.length < 28 && Math.random() < 0.2) spawnBubble();

      // Seabed rises into view over the last stretch of the page.
      const max = document.documentElement.scrollHeight - height;
      const progress = max > 0 ? scroll / max : 0;
      drawSeabed(t, Math.min(1, Math.max(0, (progress - 0.86) / 0.14)));

      if (depthRef.current) depthRef.current.textContent = String(Math.round(progress * 180)).padStart(3, '0');
    };

    const onMove = (event: PointerEvent) => { pointer.x = event.clientX; pointer.y = event.clientY; };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };
    const onDown = (event: PointerEvent) => {
      if ((event.target as Element).closest('a, button, input, label, dialog, .fx-game')) return;
      ripples.push({ x: event.clientX, y: event.clientY, born: performance.now() });
      if (ripples.length > 4) ripples.shift();
      for (let i = 0; i < 7; i++) spawnBubble(event.clientX + rand(-14, 14), event.clientY + rand(-6, 10));
      // Fish near the splash scatter.
      for (const f of fish) if (Math.hypot(f.x - event.clientX, f.y - event.clientY) < 220) f.flee = 1;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };
    const onScrollStatic = () => render(performance.now(), 16);

    resize();
    populate();
    void document.fonts?.ready.then(setFont);
    window.addEventListener('resize', resize);
    if (reduce) {
      render(performance.now(), 16);
      window.addEventListener('scroll', onScrollStatic, { passive: true });
    } else {
      raf = requestAnimationFrame(frame);
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeave);
      window.addEventListener('pointerdown', onDown, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScrollStatic);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="fx-ocean" aria-hidden="true" />
      <p className="fx-depth fx-mono" aria-hidden="true">
        <span className="fx-depth-arrow">▼</span> depth <span ref={depthRef}>000</span> m
      </p>
    </>
  );
}
