import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './hooks';
import { C, Glyphs, Grid, Layer } from './ocean/grid';
import { Fish, Jelly, Octopus, Shark, Turtle, rand } from './ocean/creatures';
import type { Food, World } from './ocean/creatures';

/* ───────────────────────────────────────────────────────────────
   ASCII ocean behind the fancy site. Everything is rasterised into
   a character grid each frame: shimmering water, procedural
   creatures with steering AI (see ocean/creatures.ts), food,
   bubbles, ink, and a seabed near the end of the page.

   Interaction: moving the cursor lights the water and scares fish;
   resting it makes curious fish and the turtle come to look;
   clicking sends a ripple and drops food the fish race to eat.
   ─────────────────────────────────────────────────────────────── */

const FONT_SIZE = 10;
const LINE = 11;
const FONT = `${FONT_SIZE}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
const WATER = ['.', '-', '~', '≈'];
const WATER_LIT = [1, 2, 3, 3];
/** The ocean scrolls at half the page's speed, so it reads as a background layer. */
const PARALLAX = 0.5;

interface Bubble { x: number; y: number; vy: number; phase: number; size: number }
interface Particle { x: number; y: number; vx: number; vy: number; born: number; life: number; char: string; color: number }
interface Ripple { x: number; y: number; born: number }

export function Ocean() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = prefersReducedMotion();
    /** Water lives on a fixed character grid; everything that moves uses the smooth layer. */
    const grid = new Grid();
    const layer = new Layer();
    let glyphs = new Glyphs(FONT, 6, LINE, 1);
    let dpr = 1;
    let raf = 0;
    let lastFrame = 0;
    /** The cursor in screen coordinates; world.pointer holds it in ocean coordinates. */
    const screenPointer = { x: -9999, y: -9999 };

    const bubbles: Bubble[] = [];
    const particles: Particle[] = [];
    const ripples: Ripple[] = [];
    const jellies: Jelly[] = [];
    const octopuses: Octopus[] = [];
    const turtles: Turtle[] = [];
    const crab = { x: 120, dir: 1, blinkUntil: 0 };

    /** Soft glow sprite, drawn under the grid (cheaper than shadowBlur). */
    const glowSprite = (() => {
      const size = 128;
      const image = document.createElement('canvas');
      image.width = image.height = size;
      const g = image.getContext('2d');
      if (g) {
        const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(200, 170, 255, 0.5)');
        gradient.addColorStop(0.45, 'rgba(200, 170, 255, 0.16)');
        gradient.addColorStop(1, 'rgba(200, 170, 255, 0)');
        g.fillStyle = gradient;
        g.fillRect(0, 0, size, size);
      }
      return image;
    })();
    const glows: [number, number, number, number][] = [];

    const spawnBubble = (x = rand(0, world.w), y = world.oy + world.h + rand(0, 80), size = Math.random()) => {
      if (bubbles.length < 50) bubbles.push({ x, y, vy: -rand(0.3, 0.8) * (0.6 + size * 0.6), phase: rand(0, 10), size });
    };

    const world: World = {
      w: 0, h: 0, H: 0, oy: 0, t: 0, now: 0, k: 1, dim: 0.85, grid: layer,
      pointer: { x: -9999, y: -9999, vx: 0, vy: 0, lastMove: -9999 },
      food: [], fish: [], shark: null,
      glow: (x, y, size, alpha) => { glows.push([x, y - world.oy, size, alpha]); },
      bubble: (x, y, size = Math.random()) => spawnBubble(x, y, size),
      burst: (x, y, count, chars, color, speed, life) => {
        const now = performance.now();
        for (let i = 0; i < count; i++) {
          const angle = rand(0, Math.PI * 2);
          const v = rand(0.2, 1) * speed;
          particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, born: now, life, char: chars[Math.floor(Math.random() * chars.length)], color });
        }
      },
    };

    const small = () => world.w < 700;
    const oceanHeight = () => Math.max(world.h, (document.documentElement.scrollHeight - world.h) * PARALLAX + world.h);

    const measure = () => {
      ctx.font = FONT;
      const cw = Math.max(5, ctx.measureText('M').width);
      grid.resize(world.w, world.h, cw, LINE);
      layer.resize(world.w, world.h, cw, LINE);
      glyphs = new Glyphs(FONT, cw, LINE, dpr);
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      world.w = window.innerWidth;
      world.h = window.innerHeight;
      world.dim = small() ? 0.5 : 0.85;
      canvas.width = world.w * dpr;
      canvas.height = world.h * dpr;
      canvas.style.width = `${world.w}px`;
      canvas.style.height = `${world.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measure();
    };

    /**
     * Spreads animals through the whole page-tall ocean, each with its own home depth,
     * plus a random welcome group in the screen the visitor lands on.
     * With `keepWelcome`, animals in the current screen stay put and only the rest are re-spread
     * (used when the page grows as images load).
     */
    const populate = (keepWelcome = false) => {
      const { w, h, oy } = world;
      const H = (world.H = oceanHeight());
      const screens = H / h;
      const now = performance.now();
      const per = (perScreen: number) => Math.max(1, Math.round(screens * perScreen));
      // Depths outside the landing screen, so it doesn't get crowded on top of the welcome group.
      const depth = (i: number, n: number) => {
        let y = ((i + rand(0.2, 0.8)) / n) * Math.max(100, H - 200 - h) + 100;
        if (y > oy - 80) y += h + 160;
        return Math.min(H - 60, y);
      };
      const inView = (y: number) => y > oy - 100 && y < oy + h + 100;
      const mobile = small();

      if (keepWelcome) {
        world.fish = world.fish.filter(f => inView(f.home));
        jellies.splice(0, jellies.length, ...jellies.filter(j => inView(j.y)));
        octopuses.splice(0, octopuses.length, ...octopuses.filter(o => inView(o.home)));
        turtles.splice(0, turtles.length, ...turtles.filter(t => inView(t.home)));
      } else {
        world.fish = [];
        jellies.length = 0;
        octopuses.length = 0;
        turtles.length = 0;
        world.shark = null;
      }

      const school = (species: 'minnow' | 'tang' | 'snapper', y: number, count: number, spread: number, cx = rand(w * 0.15, w * 0.85), angle = rand(0, Math.PI * 2)) => {
        for (let i = 0; i < count; i++) {
          const fy = y + rand(-spread, spread) * 0.6;
          world.fish.push(new Fish(species, cx + rand(-spread, spread) * (cx < 0 || cx > w ? 0.6 : 1), fy, angle + rand(-0.4, 0.4), y));
        }
      };

      /* Welcome group: always something to see on arrival, different every visit. */
      if (!keepWelcome) {
        const at = (a: number, b: number) => oy + h * rand(a, b);
        const fromLeft = Math.random() < 0.5;
        // A minnow school swims in from one side.
        school('minnow', at(0.3, 0.75), mobile ? 6 : 9, 70, fromLeft ? -90 : w + 90, fromLeft ? rand(-0.3, 0.3) : Math.PI + rand(-0.3, 0.3));
        jellies.push(new Jelly(rand(w * 0.1, w * 0.9), at(0.25, 0.85)));
        if (Math.random() < 0.5) school('tang', at(0.2, 0.7), mobile ? 2 : 3, 110);
        else school('snapper', at(0.3, 0.8), Math.random() < 0.5 ? 1 : 2, 90, fromLeft ? w + 100 : -100, fromLeft ? Math.PI : 0);
        if (!mobile) {
          const guest = ['turtle', 'octopus', 'shark'][Math.floor(Math.random() * 3)];
          if (guest === 'turtle') turtles.push(new Turtle(fromLeft ? w + 60 : -60, at(0.3, 0.7)));
          else if (guest === 'octopus') octopuses.push(new Octopus(rand(w * 0.3, w * 0.85), at(0.55, 0.9)));
          else {
            // The shark cruises across the screen, then heads off to its own depth.
            const dir = Math.random() < 0.5 ? 1 : -1;
            const shark = new Shark(dir > 0 ? -320 : w + 320, at(0.35, 0.7), now);
            shark.vx = dir * 1.1;
            shark.vy = 0;
            shark.wander = dir > 0 ? 0 : Math.PI;
            shark.home = rand(H * 0.3, H * 0.75);
            world.shark = shark;
          }
        }
      }

      /* Everyone else, spread through the rest of the page. */
      const minnowSchools = per(mobile ? 0.3 : 0.45);
      for (let i = 0; i < minnowSchools; i++) school('minnow', depth(i, minnowSchools), mobile ? 5 : 7, 80);
      const tangs = per(mobile ? 0.15 : 0.25);
      for (let i = 0; i < tangs; i++) school('tang', depth(i, tangs), mobile ? 2 : 3, 120);
      const snappers = per(mobile ? 0.15 : 0.3);
      for (let i = 0; i < snappers; i++) school('snapper', depth(i, snappers), 1, 0);
      const jellyCount = per(mobile ? 0.25 : 0.35);
      for (let i = 0; i < jellyCount; i++) jellies.push(new Jelly(rand(60, w - 60), depth(i, jellyCount)));
      const octoCount = per(0.12);
      for (let i = 0; i < octoCount; i++) octopuses.push(new Octopus(rand(w * 0.2, w * 0.8), depth(i, octoCount)));
      if (!mobile) {
        const turtleCount = per(0.12);
        for (let i = 0; i < turtleCount; i++) turtles.push(new Turtle(rand(w * 0.2, w * 0.8), depth(i, turtleCount)));
        world.shark ??= new Shark(rand(0, w), depth(0, 1), now);
      }
      if (!keepWelcome) for (let i = 0; i < 24; i++) spawnBubble(rand(0, w), rand(0, h) + oy);
    };

    /* ── Water ──────────────────────────────────────────────── */

    const drawWater = (now: number, scroll: number) => {
      const t = now / 1000;
      const { cols, rows, cw, ch } = grid;
      const depthLight = Math.max(0.25, 1 - scroll / 6000);
      const { x: px, y: py } = world.pointer;
      const lit = now - world.pointer.lastMove < 2500;
      for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].born > 2400) ripples.splice(i, 1);
      const rowShift = scroll * 0.012;
      for (let r = 0; r < rows; r++) {
        const y = (r + 0.5) * ch;
        const rr = r + rowShift;
        const light = depthLight * (0.5 + 0.5 * (1 - y / world.h));
        const rowA = rr * 0.032 + t * 0.6, rowB = rr * 0.17 - t * 0.45, rowC = -rr * 0.045 + t * 0.3;
        const nearRow = lit && Math.abs(y - py) < 170;
        for (let c = r & 1; c < cols; c += 2) {
          const x = (c + 0.5) * cw;
          let v = Math.sin(c * 0.062 + rowA) + Math.sin(rowB + c * 0.016) + Math.sin(c * 0.027 + rowC);
          let glow = 0;
          if (nearRow && Math.abs(x - px) < 170) {
            const f = Math.max(0, 1 - Math.hypot(x - px, y - py) / 170);
            v += f * 2.2;
            glow += f;
          }
          for (const ripple of ripples) {
            const age = now - ripple.born;
            const gap = Math.hypot(x - ripple.x, y - ripple.y) - age * 0.42;
            if (gap > 60 || gap < -60) continue;
            const band = Math.exp(-(gap * gap) / 500) * (1 - age / 2400);
            v += band * 3;
            glow += band;
          }
          if (v < 1.25) continue;
          const level = Math.min(3, Math.floor((v - 1.25) * 2.2));
          glow = Math.min(1, glow);
          grid.put(c, r, WATER[level], glow > 0.08 ? WATER_LIT[Math.min(3, Math.floor(glow * 3.5))] : C.WATER, (0.05 + level * 0.035) * light + glow * 0.28, 0);
        }
      }
    };

    /* ── Seabed ─────────────────────────────────────────────── */

    const drawSeabed = (t: number, now: number, k: number) => {
      const { w, H, oy, h, pointer } = world;
      const floor = H - LINE * 2;
      if (floor < oy - 200 || floor > oy + h + 200) return;
      const rise = 1;
      // Kelp: sways with the current and bends away from the cursor.
      const stalks = Math.floor(w / 70);
      for (let s = 0; s < stalks; s++) {
        const x0 = s * 70 + ((s * 37) % 40);
        const tall = 70 + ((s * 53) % 70);
        let lx = x0, ly = floor;
        const segs = 9;
        for (let i = 1; i <= segs; i++) {
          const f = i / segs;
          const y = floor - tall * f;
          let x = x0 + Math.sin(t * 1.1 + s * 1.7 - f * 2.2) * f * 14;
          const dx = x - pointer.x, dy = y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < 90) x += Math.sign(dx || 1) * (90 - d) * 0.45 * f;
          layer.line(lx, ly, x, y, C.WEED, 0.45 * rise * (1 - f * 0.4), 0.45 * rise * (1 - f * 0.5), 2);
          if (i % 2 === 0 && i < segs) layer.putPx(x + (i % 4 ? 5 : -5), y, i % 4 ? ')' : '(', C.WEED, 0.3 * rise, 2);
          lx = x; ly = y;
        }
      }
      // Sand
      for (let x = 0; x < w; x += layer.cw) {
        const i = Math.floor(x / layer.cw);
        layer.putPx(x, floor + 2, (i * 7) % 5 === 0 ? '_' : (i * 3) % 7 === 0 ? ',' : '.', C.SAND, 0.22 * rise, 2);
      }
      layer.putPx(w * 0.72, floor - 4, ['*', '✶', '✳', '✶'][Math.floor(t * 1.5) % 4], C.STAR, 0.55 * rise, 2);

      // Crab: scuttles in bursts, snaps its claws, blinks, and hurries away from the cursor.
      const scared = Math.abs(pointer.x - crab.x) < 90 && Math.abs(pointer.y - floor) < 80;
      if (scared) crab.dir = pointer.x < crab.x + 40 ? 1 : -1;
      const scuttle = scared ? 1 : Math.max(0, Math.sin(t * 1.3));
      crab.x += crab.dir * scuttle * (scared ? 3.5 : 1.6) * k;
      if (crab.x < 20) crab.dir = 1;
      if (crab.x > w - 130) crab.dir = -1;
      if (Math.random() < 0.004) crab.dir *= -1;
      if (Math.random() < 0.006) crab.blinkUntil = now + 160;
      const snap = Math.sin(t * 7) > 0.6;
      const eyes = now < crab.blinkUntil ? '-,,,-' : '°,,,°';
      const hop = scuttle > 0.1 ? Math.abs(Math.sin(t * 12)) * -3 : 0;
      layer.text(crab.x, floor - LINE + hop, `${snap ? '(\\/)' : '(\\_/)'}(${eyes})${snap ? '(\\/)' : '(\\_/)'}`, C.CRAB, 0.7 * rise, 6);
    };

    /* ── Frame ──────────────────────────────────────────────── */

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastFrame < 12) return; // ~60 fps cap on high-refresh screens.
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;
      render(now, dt);
    };

    const render = (now: number, dt: number) => {
      const t = now / 1000;
      const scroll = window.scrollY;
      const k = dt / 16;
      world.H = oceanHeight();
      world.oy = scroll * PARALLAX;
      grid.oy = world.oy;
      layer.oy = world.oy;
      Object.assign(world, { t, now, k });
      world.pointer.x = screenPointer.x;
      world.pointer.y = screenPointer.y + world.oy;
      world.pointer.vx *= 0.85;
      world.pointer.vy *= 0.85;

      grid.clear();
      layer.clear();
      glows.length = 0;
      drawWater(now, scroll);

      for (const f of world.fish) f.update(world);
      world.shark?.update(world);
      jellies.forEach(j => j.update(world));
      octopuses.forEach(o => o.update(world));
      turtles.forEach(tu => tu.update(world));

      jellies.forEach(j => j.draw(world));
      octopuses.forEach(o => o.draw(world));
      turtles.forEach(tu => tu.draw(world));
      for (const f of world.fish) f.draw(world);
      world.shark?.draw(world);

      // Food sinks with a wobble until eaten.
      for (let i = world.food.length - 1; i >= 0; i--) {
        const f = world.food[i];
        f.y += f.vy * k;
        f.x += Math.sin(t * 2 + f.phase) * 0.3 * k;
        if (f.eaten || f.y > world.H || f.y > world.oy + world.h + 200) { world.food.splice(i, 1); continue; }
        layer.putPx(f.x, f.y, '*', C.FOOD, 0.6, 8);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const age = (now - p.born) / p.life;
        if (age >= 1) { particles.splice(i, 1); continue; }
        p.x += p.vx * k; p.y += p.vy * k;
        p.vx *= 0.96 ** k; p.vy = p.vy * 0.96 ** k + 0.008 * k;
        layer.putPx(p.x, p.y, p.char, p.color, 0.45 * (1 - age) * world.dim, 7);
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += b.vy * k;
        b.x += Math.sin(t * 2.4 + b.phase) * 0.35 * k;
        b.size = Math.min(1, b.size + 0.0006 * k);
        // Bubbles pop at the surface; others just drift out of view.
        if ((b.y < 20 && b.size > 0.5 && Math.random() < 0.05) || b.y < world.oy - 30) {
          if (b.y < 20 && b.y > -20) world.burst(b.x, b.y, 3, ".·'", C.BUBBLE, 0.8, 450);
          bubbles.splice(i, 1);
          continue;
        }
        layer.putPx(b.x, b.y, b.size > 0.7 ? 'o' : b.size > 0.35 ? '°' : '.', C.BUBBLE, 0.16 + b.size * 0.2, 7);
      }
      if (Math.random() < 0.07) spawnBubble();

      const max = document.documentElement.scrollHeight - world.h;
      const progress = max > 0 ? scroll / max : 0;
      drawSeabed(t, now, k);

      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, world.w, world.h);
      for (const [x, y, size, alpha] of glows) {
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(glowSprite, x - size / 2, y - size / 2, size, size);
      }
      glyphs.draw(ctx, grid);
      layer.draw(ctx, glyphs);

      const depth = String(Math.round(progress * 180)).padStart(3, '0');
      if (depthRef.current && depthRef.current.textContent !== depth) depthRef.current.textContent = depth;
    };

    /* ── Events ─────────────────────────────────────────────── */

    const onMove = (event: PointerEvent) => {
      const p = world.pointer;
      if (screenPointer.x > -1000) { p.vx = event.clientX - screenPointer.x; p.vy = event.clientY - screenPointer.y; }
      screenPointer.x = event.clientX;
      screenPointer.y = event.clientY;
      p.lastMove = performance.now();
    };
    const onLeave = () => { screenPointer.x = -9999; screenPointer.y = -9999; };
    const onDown = (event: PointerEvent) => {
      if ((event.target as Element).closest('a, button, input, label, dialog, .fx-game')) return;
      const { clientX: x, clientY: y } = event;
      const now = performance.now();
      ripples.push({ x, y, born: now });
      if (ripples.length > 4) ripples.shift();
      // Bubbles, food and the shark live in ocean coordinates.
      const oy = y + world.oy;
      for (let i = 0; i < 6; i++) spawnBubble(x + rand(-12, 12), oy + rand(-6, 8), rand(0, 0.7));
      // Feeding time: a few pellets sink from the click.
      const food: Food[] = Array.from({ length: Math.floor(rand(3, 6)) }, () => ({ x: x + rand(-18, 18), y: oy + rand(-8, 8), vy: rand(0.2, 0.35), phase: rand(0, 10), eaten: false }));
      world.food.push(...food);
      if (world.food.length > 30) world.food.splice(0, world.food.length - 30);
      world.shark?.scare(x, oy, now);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) { lastFrame = performance.now(); raf = requestAnimationFrame(frame); }
    };
    const onScrollStatic = () => render(performance.now(), 16);

    resize();
    world.oy = window.scrollY * PARALLAX;
    grid.oy = layer.oy = world.oy;
    populate();
    void document.fonts?.ready.then(measure);
    const onResize = () => { const wasSmall = small(); resize(); if (wasSmall !== small()) populate(); };
    // The page grows as images load; once it settles, spread animals over the full ocean.
    const settle = window.setTimeout(() => { if (Math.abs(oceanHeight() - world.H) > world.h * 0.5) populate(true); }, 2500);
    window.addEventListener('resize', onResize);
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
      clearTimeout(settle);
      window.removeEventListener('resize', onResize);
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
