import { C, shade } from './grid';
import type { Layer } from './grid';

/* ───────────────────────────────────────────────────────────────
   Procedural sea creatures. Bodies are shapes rasterised into the
   ASCII grid, so they can face any direction and bend as they swim.
   Tentacles and arms are verlet ropes. Behaviour is steering-based:
   fish flock, feed, flee and get curious; the shark hunts.
   ─────────────────────────────────────────────────────────────── */

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;
/** Shortest signed difference between two angles. */
const angleTo = (from: number, to: number) => ((((to - from) % TAU) + TAU * 1.5) % TAU) - Math.PI;

export interface Pointer { x: number; y: number; vx: number; vy: number; lastMove: number }
export interface Food { x: number; y: number; vy: number; phase: number; eaten: boolean }

export interface World {
  /** Viewport size. */
  w: number;
  h: number;
  /** Ocean height (it spans the whole page) and the viewport's offset within it. */
  H: number;
  oy: number;
  t: number;
  now: number;
  k: number;
  dim: number;
  /** Creatures draw into a free-positioned layer so they move smoothly. */
  grid: Layer;
  pointer: Pointer;
  food: Food[];
  fish: Fish[];
  shark: Shark | null;
  glow: (x: number, y: number, size: number, alpha: number) => void;
  bubble: (x: number, y: number, size?: number) => void;
  burst: (x: number, y: number, count: number, chars: string, color: number, speed: number, life: number) => void;
}

/** True while the cursor is moving (recently moved). */
const pointerActive = (w: World) => w.now - w.pointer.lastMove < 600;
/** True once the cursor has rested for a while: curious animals come to look. */
const pointerResting = (w: World) => w.now - w.pointer.lastMove > 1400 && w.pointer.x > -1000;

/** Keeps animals inside the ocean (page-tall, viewport-wide) with a soft push back from its edges. */
function boundsForce(x: number, y: number, w: World, margin: number) {
  let ax = 0;
  let ay = 0;
  if (x < margin) ax += (margin - x) * 0.0012;
  if (x > w.w - margin) ax -= (x - (w.w - margin)) * 0.0012;
  if (y < 60) ay += (60 - y) * 0.0012;
  if (y > w.H - 60) ay -= (y - (w.H - 60)) * 0.0012;
  return [ax, ay];
}

/** Gently pulls an animal back toward its home depth, so creatures stay spread through the page. */
function homeForce(y: number, home: number) {
  const d = home - y;
  return Math.abs(d) < 220 ? 0 : (d - Math.sign(d) * 220) * 0.0004;
}

/** A spot in the ocean that is out of view, for spawning without popping in. */
export function offscreenY(w: World) {
  for (let i = 0; i < 8; i++) {
    const y = rand(80, Math.max(160, w.H - 80));
    if (y < w.oy - 150 || y > w.oy + w.h + 150) return y;
  }
  return w.oy + w.h + 200;
}

/* ── Swimmers: fish and the shark share a flexible spine ─────── */

interface SpeciesConfig {
  len: number; segs: number; R: number; color: number; z: number;
  maxSpeed: number; minSpeed: number; maxForce: number;
  sep: number; ali: number; coh: number; view: number; curious: number;
  stripes: number; tail: number; dorsal: number; eye: boolean;
  /** Burst-and-glide swimming: pause between bursts (ms), burst length (ms), burst speed ×maxSpeed, and how sharply a burst can turn. */
  burst?: { every: [number, number]; dur: [number, number]; mult: number; turn: number };
}

export const SPECIES = {
  minnow: { len: 52, segs: 6, R: 8, color: C.MINNOW, z: 3, maxSpeed: 2.3, minSpeed: 0.3, maxForce: 0.09, sep: 1.8, ali: 1, coh: 0.6, view: 110, curious: 0, stripes: 0, tail: 13, dorsal: 0, eye: true, burst: { every: [900, 2600], dur: [200, 420], mult: 2.3, turn: 0.9 } },
  tang: { len: 92, segs: 8, R: 17, color: C.TANG, z: 4, maxSpeed: 1.8, minSpeed: 0.25, maxForce: 0.06, sep: 1.4, ali: 0.7, coh: 0.6, view: 170, curious: 1, stripes: 3, tail: 22, dorsal: 15, eye: true, burst: { every: [2500, 6000], dur: [380, 700], mult: 1.8, turn: 0.5 } },
  snapper: { len: 112, segs: 9, R: 21, color: C.SNAPPER, z: 5, maxSpeed: 1.35, minSpeed: 0.15, maxForce: 0.045, sep: 1.2, ali: 0.3, coh: 0.25, view: 200, curious: 0.3, stripes: 0, tail: 26, dorsal: 18, eye: true, burst: { every: [4000, 9000], dur: [500, 900], mult: 1.6, turn: 0.3 } },
  shark: { len: 300, segs: 14, R: 25, color: C.SHARK, z: 6, maxSpeed: 1.1, minSpeed: 0.55, maxForce: 0.05, sep: 0, ali: 0, coh: 0, view: 0, curious: 0, stripes: 0, tail: 48, dorsal: 38, eye: true },
} satisfies Record<string, SpeciesConfig>;

export type SpeciesId = keyof typeof SPECIES;

/** Body thickness along the spine: rounded head, widest just behind it, tapering to the tail. */
function profile(t: number) {
  if (t < 0.22) return 0.3 + 0.7 * Math.sqrt(t / 0.22);
  return 1 - 0.85 * ((t - 0.22) / 0.78) ** 1.4;
}

abstract class Swimmer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spine: { x: number; y: number }[];
  phase = rand(0, TAU);
  flash = 0;
  panic = 0;
  /** 0 = gliding, 1 = all-out swimming; drives tail-beat rate and how much the body bends. */
  effort = 0.5;
  readonly sp: SpeciesConfig;

  constructor(species: SpeciesConfig, x: number, y: number, angle: number) {
    this.sp = species;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * species.minSpeed * 1.5;
    this.vy = Math.sin(angle) * species.minSpeed * 1.5;
    const seg = species.len / species.segs;
    this.spine = Array.from({ length: species.segs + 1 }, (_, i) => ({ x: x - Math.cos(angle) * seg * i, y: y - Math.sin(angle) * seg * i }));
  }

  get speed() { return Math.hypot(this.vx, this.vy); }

  shift(dy: number) {
    this.y += dy;
    for (const p of this.spine) p.y += dy;
  }

  /** Applies a steering force, clamps speed, moves, and drags the spine along behind the head. */
  integrate(w: World, ax: number, ay: number, maxSpeed: number) {
    const { k } = w;
    const force = Math.hypot(ax, ay);
    const maxForce = this.sp.maxForce * (1 + this.panic * 2);
    if (force > maxForce) { ax *= maxForce / force; ay *= maxForce / force; }
    this.vx += ax * k;
    this.vy += ay * k;
    let speed = this.speed;
    if (speed > maxSpeed) { this.vx *= maxSpeed / speed; this.vy *= maxSpeed / speed; speed = maxSpeed; }
    if (speed < this.sp.minSpeed) {
      const s = speed || 1;
      this.vx = (this.vx / s) * this.sp.minSpeed;
      this.vy = (this.vy / s) * this.sp.minSpeed;
      speed = this.sp.minSpeed;
    }
    this.x += this.vx * k;
    this.y += this.vy * k;
    this.panic *= 0.97 ** k;
    this.flash *= 0.95 ** k;
    // Tail beats faster the faster the animal swims.
    this.phase += k * (0.06 + speed * 0.1 + this.effort * 0.16);

    const seg = this.sp.len / this.sp.segs;
    this.spine[0].x = this.x;
    this.spine[0].y = this.y;
    for (let i = 1; i < this.spine.length; i++) {
      const prev = this.spine[i - 1];
      const p = this.spine[i];
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      p.x = prev.x + (dx / d) * seg;
      p.y = prev.y + (dy / d) * seg;
    }
  }

  /** The spine with a travelling wave added, so the body undulates as it swims. */
  protected wavySpine() {
    const { R, segs } = this.sp;
    return this.spine.map((p, i) => {
      const a = this.spine[Math.max(0, i - 1)];
      const b = this.spine[Math.min(segs, i + 1)];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const amp = (R * 0.55 * (i / segs) ** 1.3 + (i === 0 ? R * 0.05 : 0)) * (0.55 + this.effort * 0.7);
      const off = Math.sin(this.phase - i * 0.8) * amp;
      return { x: p.x - (dy / d) * off, y: p.y + (dx / d) * off };
    });
  }

  /** Rasterises the body and draws tail, fins and eye. Returns the wavy spine for extra details. */
  protected drawBody(w: World, color: number, alpha: number) {
    const { R, segs, stripes, z, tail, dorsal } = this.sp;
    const pts = this.wavySpine();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    if (x1 < -R * 3 || x0 > w.w + R * 3 || y1 < w.oy - R * 3 || y0 > w.oy + w.h + R * 3) return pts;

    // Precompute segments for nearest-point lookups.
    const segX = new Float32Array(segs), segY = new Float32Array(segs), segDx = new Float32Array(segs), segDy = new Float32Array(segs), segL2 = new Float32Array(segs);
    for (let i = 0; i < segs; i++) {
      segX[i] = pts[i].x; segY[i] = pts[i].y;
      segDx[i] = pts[i + 1].x - pts[i].x; segDy[i] = pts[i + 1].y - pts[i].y;
      segL2[i] = segDx[i] ** 2 + segDy[i] ** 2 || 1;
    }
    let lastT = 0;
    const sample = (px: number, py: number) => {
      let best = Infinity, bestT = 0, qx = 0, qy = 0;
      for (let i = 0; i < segs; i++) {
        let u = ((px - segX[i]) * segDx[i] + (py - segY[i]) * segDy[i]) / segL2[i];
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const cx = segX[i] + segDx[i] * u;
        const cy = segY[i] + segDy[i] * u;
        const d2 = (px - cx) ** 2 + (py - cy) ** 2;
        if (d2 < best) { best = d2; bestT = (i + u) / segs; qx = cx; qy = cy; }
      }
      const r = profile(bestT) * R;
      if (best > r * r) return -1;
      lastT = bestT;
      return shade((px - qx) / r, (py - qy) / r);
    };
    const pattern = stripes
      ? (_px: number, _py: number, s: number) => ((lastT * stripes + 0.15) % 1 < 0.2 && lastT > 0.15 && lastT < 0.85 ? (s > 0.5 ? '|' : ':') : null)
      : undefined;
    w.grid.fill(x0 - R, y0 - R, x1 + R, y1 + R, sample, color, alpha, z, pattern, pts[0].x, pts[0].y);

    // Tail fin: two lobes that open and close with the beat.
    const end = pts[segs];
    const prev = pts[segs - 1];
    let bx = end.x - prev.x, by = end.y - prev.y;
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl; by /= bl;
    const spread = 0.55 + Math.sin(this.phase + 1.2) * 0.12;
    for (const side of [-1, 1]) {
      const a = Math.atan2(by, bx) + side * spread;
      const len = tail * (side === 1 ? 1 : 0.92);
      w.grid.line(end.x, end.y, end.x + Math.cos(a) * len, end.y + Math.sin(a) * len, color, alpha * 0.9, alpha * 0.5, z);
    }

    // Dorsal fin on the upper side of the body.
    if (dorsal) {
      const mid = pts[Math.floor(segs * 0.35)];
      const next = pts[Math.floor(segs * 0.35) + 1];
      let nx = -(next.y - mid.y), ny = next.x - mid.x;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const r = profile(0.35) * R;
      const baseX = mid.x + nx * r * 0.8, baseY = mid.y + ny * r * 0.8;
      const tipX = baseX + nx * dorsal + (next.x - mid.x) * 0.6;
      const tipY = baseY + ny * dorsal + (next.y - mid.y) * 0.6;
      w.grid.line(baseX, baseY, tipX, tipY, color, alpha * 0.85, alpha * 0.55, z);
    }

    // Eye just behind the nose, on the upper side.
    if (this.sp.eye) {
      const head = pts[0];
      const neck = pts[1];
      let fx = head.x - neck.x, fy = head.y - neck.y;
      const fl = Math.hypot(fx, fy) || 1;
      fx /= fl; fy /= fl;
      let ux = -fy, uy = fx;
      if (uy > 0) { ux = -ux; uy = -uy; }
      const ex = head.x - fx * R * 0.55 + ux * R * 0.25;
      const ey = head.y - fy * R * 0.55 + uy * R * 0.25;
      w.grid.putPx(ex, ey, this.panic > 0.4 ? 'O' : 'o', C.EYE, Math.min(1, alpha * 1.15), z + 1);
    }
    return pts;
  }
}

export class Fish extends Swimmer {
  readonly species: Exclude<SpeciesId, 'shark'>;
  wander = rand(0, TAU);
  fullUntil = 0;
  alive = true;
  respawnAt = 0;
  home: number;
  burstUntil = 0;
  nextBurst = performance.now() + rand(0, 2500);

  constructor(species: Exclude<SpeciesId, 'shark'>, x: number, y: number, angle: number, home = y) {
    super(SPECIES[species], x, y, angle);
    this.species = species;
    this.home = home;
  }

  /** A quick dart, often with a turn. Spontaneous darts ripple through the school. */
  burst(w: World, induced = false) {
    const b = this.sp.burst;
    if (!b || w.now < this.burstUntil) return;
    this.burstUntil = w.now + rand(b.dur[0], b.dur[1]);
    this.nextBurst = this.burstUntil + rand(b.every[0], b.every[1]);
    const turn = rand(-b.turn, b.turn) * (induced ? 0.4 : 1);
    const c = Math.cos(turn), s = Math.sin(turn);
    [this.vx, this.vy] = [this.vx * c - this.vy * s, this.vx * s + this.vy * c];
    if (induced) return;
    for (const o of w.fish) {
      if (o === this || o.species !== this.species || !o.alive) continue;
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      // Neighbours follow a moment later, the further away the later.
      if (d < this.sp.view) o.nextBurst = Math.min(o.nextBurst, w.now + 40 + d * 2.2 + rand(0, 80));
    }
  }

  update(w: World) {
    if (!this.alive) {
      if (w.now > this.respawnAt) this.respawn(w);
      return;
    }
    const sp = this.sp;
    let ax = 0, ay = 0;

    // Flocking with the same species: separation, alignment, cohesion.
    let sx = 0, sy = 0, avx = 0, avy = 0, cx = 0, cy = 0, n = 0;
    // Keep a body length or so apart, so outlines don't merge into a tangle.
    const sepDist = Math.max(sp.R * 3.4, sp.len * 0.75);
    for (const o of w.fish) {
      if (o === this || !o.alive || o.species !== this.species) continue;
      const dx = o.x - this.x, dy = o.y - this.y;
      if (dx > sp.view || dx < -sp.view || dy > sp.view || dy < -sp.view) continue;
      const d = Math.hypot(dx, dy);
      if (d > sp.view || d === 0) continue;
      n++;
      avx += o.vx; avy += o.vy; cx += o.x; cy += o.y;
      if (d < sepDist) { sx -= (dx / d) * (sepDist - d) / sepDist; sy -= (dy / d) * (sepDist - d) / sepDist; }
    }
    if (n) {
      ax += (avx / n - this.vx) * 0.05 * sp.ali;
      ay += (avy / n - this.vy) * 0.05 * sp.ali;
      // Scared schools pack tighter.
      ax += (cx / n - this.x) * 0.0009 * sp.coh * (1 + this.panic * 2);
      ay += (cy / n - this.y) * 0.0009 * sp.coh * (1 + this.panic * 2);
    }
    ax += sx * sp.sep * 0.2;
    ay += sy * sp.sep * 0.2;

    // Wandering.
    this.wander += rand(-0.3, 0.3) * w.k;
    ax += Math.cos(this.wander) * 0.02;
    ay += Math.sin(this.wander) * 0.012 + homeForce(this.y, this.home);

    // A moving cursor is a threat; a resting cursor is interesting.
    const p = w.pointer;
    const pdx = this.x - p.x, pdy = this.y - p.y;
    const pd = Math.hypot(pdx, pdy) || 1;
    if (pointerActive(w) && pd < 150) {
      const threat = ((150 - pd) / 150) * (1 + Math.min(Math.hypot(p.vx, p.vy) / 12, 2));
      ax += (pdx / pd) * threat * 0.4;
      ay += (pdy / pd) * threat * 0.4;
      if (threat > 0.45 && this.panic < 0.45) this.burst(w);
      this.panic = Math.max(this.panic, Math.min(1, threat));
    } else if (pointerResting(w) && sp.curious > 0 && pd < 240) {
      // Only fish already nearby wander over for a look.
      const keep = 70 + sp.R * 3;
      const pull = ((pd - keep) / 240) * 0.025 * sp.curious;
      ax -= (pdx / pd) * pull;
      ay -= (pdy / pd) * pull;
    }

    // Sharks: flee, hard.
    const shark = w.shark;
    if (shark) {
      const dx = this.x - shark.x, dy = this.y - shark.y;
      const d = Math.hypot(dx, dy) || 1;
      const fear = shark.hunting ? 260 : 170;
      if (d < fear) {
        const f = (fear - d) / fear;
        ax += (dx / d) * f * 0.6;
        ay += (dy / d) * f * 0.6;
        if (f > 0.4 && this.panic < 0.4) this.burst(w);
        this.panic = Math.max(this.panic, f);
      }
    }

    // Food: swim to the nearest pellet and eat it.
    if (w.now > this.fullUntil && this.panic < 0.5) {
      let best: Food | null = null, bestD = 260;
      for (const f of w.food) {
        if (f.eaten) continue;
        const d = Math.hypot(f.x - this.x, f.y - this.y);
        if (d < bestD) { bestD = d; best = f; }
      }
      if (best) {
        const dx = best.x - this.x, dy = best.y - this.y;
        const d = bestD || 1;
        ax += ((dx / d) * sp.maxSpeed * 1.3 - this.vx) * 0.08;
        ay += ((dy / d) * sp.maxSpeed * 1.3 - this.vy) * 0.08;
        // Dart in to snatch it.
        if (d < 110 && w.now > this.burstUntil && Math.random() < 0.05) this.burst(w, true);
        if (d < sp.R + 7) {
          best.eaten = true;
          this.fullUntil = w.now + rand(4000, 8000);
          this.flash = 1;
          w.bubble(this.x, this.y - sp.R, 0.15);
        }
      }
    }

    const [bx, by] = boundsForce(this.x, this.y, w, 40);
    ax += bx; ay += by;
    // Burst and glide: sprint briefly, then coast down to a slow cruise.
    if (w.now > this.nextBurst) this.burst(w, true);
    const bursting = w.now < this.burstUntil;
    const b = sp.burst;
    const top = bursting && b ? sp.maxSpeed * b.mult : sp.maxSpeed;
    this.integrate(w, ax, ay, top * (1 + this.panic * 0.6));
    const cruise = sp.maxSpeed * (0.35 + this.panic * 0.5);
    const target = bursting ? top : cruise;
    const speed = this.speed || 1;
    const next = speed + (target - speed) * (bursting ? 0.22 : target < speed ? 0.055 : 0.04) * w.k;
    this.vx *= next / speed;
    this.vy *= next / speed;
    this.effort += ((bursting ? 1 : 0.15 + this.panic * 0.5) - this.effort) * (bursting ? 0.3 : 0.05) * w.k;
  }

  respawn(w: World) {
    // Come back somewhere out of view.
    const x = rand(60, w.w - 60);
    const y = offscreenY(w);
    const fresh = new Fish(this.species, x, y, rand(0, TAU));
    Object.assign(this, { x, y, home: y, vx: fresh.vx, vy: fresh.vy, spine: fresh.spine, alive: true, panic: 0, flash: 0 });
  }

  draw(w: World) {
    if (!this.alive) return;
    this.drawBody(w, this.sp.color, (0.42 + this.flash * 0.25) * w.dim);
  }
}

export class Shark extends Swimmer {
  hunting = false;
  fleeingUntil = 0;
  nextHunt: number;
  huntUntil = 0;
  target: Fish | null = null;
  wander = rand(0, TAU);
  home: number;

  constructor(x: number, y: number, now: number) {
    super(SPECIES.shark, x, y, Math.random() < 0.5 ? 0 : Math.PI);
    this.nextHunt = now + rand(12000, 20000);
    this.home = y;
  }

  /** Clicking near the shark makes it bolt. */
  scare(x: number, y: number, now: number) {
    if (Math.hypot(this.x - x, this.y - y) > 170) return;
    this.fleeingUntil = now + 1500;
    this.hunting = false;
    this.flash = 1;
    this.panic = 1;
    const dx = this.x - x, dy = this.y - y, d = Math.hypot(dx, dy) || 1;
    this.vx += (dx / d) * 2;
    this.vy += (dy / d) * 2;
  }

  update(w: World) {
    let ax = 0, ay = 0;
    let maxSpeed = this.sp.maxSpeed;
    const p = w.pointer;

    if (w.now < this.fleeingUntil) {
      maxSpeed = 3.4;
      ax += this.vx * 0.05;
      ay += this.vy * 0.05;
    } else if (this.hunting && this.target?.alive && w.now < this.huntUntil) {
      // Pursue: aim at where the prey is going to be.
      const t = this.target;
      const lead = Math.min(30, Math.hypot(t.x - this.x, t.y - this.y) / 3);
      const dx = t.x + t.vx * lead - this.x, dy = t.y + t.vy * lead - this.y;
      const d = Math.hypot(dx, dy) || 1;
      ax += ((dx / d) * 3 - this.vx) * 0.06;
      ay += ((dy / d) * 3 - this.vy) * 0.06;
      maxSpeed = 3;
      if (Math.hypot(t.x - this.x, t.y - this.y) < this.sp.R * 1.2) {
        t.alive = false;
        t.respawnAt = w.now + rand(6000, 10000);
        w.burst(t.x, t.y, 10, '.·°', C.BUBBLE, 1.2, 900);
        this.hunting = false;
        this.nextHunt = w.now + rand(14000, 24000);
      }
    } else {
      if (this.hunting) { this.hunting = false; this.nextHunt = w.now + rand(10000, 18000); }
      // Cruise: slow, wide turns; keep a little distance from the cursor.
      this.wander += rand(-0.12, 0.12) * w.k;
      ax += Math.cos(this.wander) * 0.02;
      ay += Math.sin(this.wander) * 0.01;
      const pdx = this.x - p.x, pdy = this.y - p.y, pd = Math.hypot(pdx, pdy) || 1;
      if (pd < 120) { ax += (pdx / pd) * 0.04; ay += (pdy / pd) * 0.04; }
      if (w.now > this.nextHunt) {
        let best: Fish | null = null, bestD = 420;
        for (const f of w.fish) {
          if (!f.alive || f.species === 'snapper') continue;
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d < bestD) { bestD = d; best = f; }
        }
        if (best) { this.hunting = true; this.target = best; this.huntUntil = w.now + 5000; }
        else this.nextHunt = w.now + 4000;
      }
    }

    const [bx, by] = boundsForce(this.x, this.y, w, -40);
    ax += bx * 0.6; ay += by * 0.6 + homeForce(this.y, this.home) * 0.5;
    this.integrate(w, ax, ay, maxSpeed);
  }

  draw(w: World) {
    this.effort += ((this.hunting || w.now < this.fleeingUntil ? 1 : 0.35) - this.effort) * 0.05 * w.k;
    const alpha = (0.36 + this.flash * 0.25 + (this.hunting ? 0.06 : 0)) * w.dim;
    const pts = this.drawBody(w, C.SHARK, alpha);
    // Pectoral fins and gill slits.
    const a = pts[2], b = pts[3];
    let fx = a.x - b.x, fy = a.y - b.y;
    const fl = Math.hypot(fx, fy) || 1;
    fx /= fl; fy /= fl;
    let dx = -fy, dy = fx;
    if (dy < 0) { dx = -dx; dy = -dy; }
    const r = profile(0.2) * this.sp.R;
    const sway = Math.sin(this.phase * 0.5) * 0.25;
    w.grid.line(a.x + dx * r * 0.7, a.y + dy * r * 0.7, a.x + dx * (r + 18) - fx * (14 + sway * 10), a.y + dy * (r + 18) - fy * 14, C.SHARK, alpha, alpha * 0.5, 7);
    for (let g = 0; g < 3; g++) {
      const gx = pts[1].x - fx * g * 4, gy = pts[1].y - fy * g * 4;
      w.grid.putPx(gx, gy, ')', C.SHARK, alpha * 0.6, 7);
    }
  }
}

/* ── Rope physics for tentacles and arms ─────────────────────── */

interface Node { x: number; y: number; px: number; py: number }
const rope = (x: number, y: number, n: number): Node[] => Array.from({ length: n }, (_, i) => ({ x, y: y + i * 4, px: x, py: y + i * 4 }));

/** Verlet step: inertia with damping plus a force, then length constraints from the anchor outward. */
function stepRope(nodes: Node[], ax: number, ay: number, segLen: number, k: number, damping: number, force: (i: number) => [number, number]) {
  nodes[0].px = nodes[0].x; nodes[0].py = nodes[0].y;
  nodes[0].x = ax; nodes[0].y = ay;
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    const vx = (n.x - n.px) * damping, vy = (n.y - n.py) * damping;
    const [fx, fy] = force(i);
    n.px = n.x; n.py = n.y;
    n.x += vx + fx * k;
    n.y += vy + fy * k;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const diff = (d - segLen) / d;
      b.x -= dx * diff; b.y -= dy * diff;
    }
  }
}
const shiftRope = (nodes: Node[], dy: number) => { for (const n of nodes) { n.y += dy; n.py += dy; } };

/* ── Jellyfish ───────────────────────────────────────────────── */

export class Jelly {
  x: number; y: number; vx = 0; vy = 0;
  angle = rand(-0.3, 0.3);
  targetAngle = 0;
  phase = rand(0, TAU);
  size = rand(26, 38);
  contract = 0;
  flash = 0;
  tentacles: Node[][];
  arms: Node[][];

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.tentacles = Array.from({ length: 6 }, () => rope(x, y, 13));
    this.arms = Array.from({ length: 2 }, () => rope(x, y, 7));
  }

  shift(dy: number) {
    this.y += dy;
    this.tentacles.forEach(t => shiftRope(t, dy));
    this.arms.forEach(t => shiftRope(t, dy));
  }

  update(w: World) {
    const { k } = w;
    this.phase += 0.034 * k;
    const s = Math.sin(this.phase);
    this.contract = Math.max(0, s) ** 2;
    // Each contraction pushes the bell along its axis.
    const ux = Math.sin(this.angle), uy = -Math.cos(this.angle);
    if (s > 0) { this.vx += ux * this.contract * 0.055 * k; this.vy += uy * this.contract * 0.055 * k; }
    this.vx *= 0.985 ** k; this.vy *= 0.985 ** k;

    // Drift and tilt; shy away from the cursor.
    if (Math.random() < 0.004 * k) this.targetAngle = rand(-0.5, 0.5);
    const p = w.pointer;
    const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < 140) {
      this.vx += (dx / d) * 0.06 * k;
      this.vy += (dy / d) * 0.06 * k;
      this.targetAngle = Math.max(-1.1, Math.min(1.1, Math.atan2(dx, -dy)));
      if (pointerActive(w)) this.flash = Math.min(1, this.flash + 0.1);
    }
    if (this.x < 40) this.targetAngle = 0.6;
    if (this.x > w.w - 40) this.targetAngle = -0.6;
    this.angle += angleTo(this.angle, this.targetAngle) * 0.02 * k;
    this.flash *= 0.96 ** k;
    this.x += this.vx * k; this.y += this.vy * k;

    if (this.y < -this.size * 6 || this.y > w.H + 300) this.reset(w, rand(40, w.w - 40), offscreenY(w));

    // Tentacles hang from the rim and trail behind the bell.
    const rx = Math.cos(this.angle), ry = Math.sin(this.angle);
    const R = this.size * (1 - 0.2 * this.contract);
    this.tentacles.forEach((nodes, j) => {
      const off = (-0.85 + (1.7 * j) / (this.tentacles.length - 1)) * R;
      stepRope(nodes, this.x + rx * off, this.y + ry * off, this.size * 0.42, k, 0.9, i => [
        -ux * 0.16 + rx * Math.sin(w.t * 2.1 - i * 0.5 + j) * 0.22,
        -uy * 0.16 + ry * Math.sin(w.t * 2.1 - i * 0.5 + j) * 0.22,
      ]);
    });
    this.arms.forEach((nodes, j) => {
      const off = (j ? 0.2 : -0.2) * R;
      stepRope(nodes, this.x + rx * off, this.y + ry * off, this.size * 0.38, k, 0.88, i => [
        -ux * 0.12 + rx * Math.sin(w.t * 1.4 + i * 0.8 + j * 2) * 0.12,
        -uy * 0.12 + ry * Math.sin(w.t * 1.4 + i * 0.8 + j * 2) * 0.12,
      ]);
    });
  }

  reset(w: World, x: number, y: number) {
    const fresh = new Jelly(x, y);
    Object.assign(this, { x, y, vx: 0, vy: -0.4, angle: rand(-0.3, 0.3), tentacles: fresh.tentacles, arms: fresh.arms, size: fresh.size });
    void w;
  }

  draw(w: World) {
    const { grid, dim } = w;
    const glowA = (0.25 + this.contract * 0.3 + this.flash * 0.2) * dim;
    const ux = Math.sin(this.angle), uy = -Math.cos(this.angle);
    const rx = Math.cos(this.angle), ry = Math.sin(this.angle);
    const R = this.size * (1 - 0.2 * this.contract);
    const H = this.size * 0.85 * (1 + 0.3 * this.contract);
    w.glow(this.x + ux * H * 0.4, this.y + uy * H * 0.4, this.size * 5, (0.14 + this.contract * 0.22 + this.flash * 0.18) * dim);

    // Bell: a dome above the rim, with faint radial canals.
    const sample = (px: number, py: number) => {
      const dx = px - this.x, dy = py - this.y;
      const u = dx * ux + dy * uy;
      const v = dx * rx + dy * ry;
      if (u < -2 || v > R || v < -R) return -1;
      const dome = H * Math.sqrt(Math.max(0, 1 - (v / R) ** 2));
      if (u > dome) return -1;
      const nv = v / R, nu = Math.max(0, u) / (H * 1.15);
      return shade(rx * nv + ux * nu, ry * nv + uy * nu) * 0.8 + 0.2;
    };
    const pattern = (px: number, py: number, s: number) => {
      const v = (px - this.x) * rx + (py - this.y) * ry;
      return Math.abs(((v / R) * 2.5 + 10) % 1 - 0.5) < 0.1 && s > 0.3 ? ':' : null;
    };
    const ext = this.size * 1.4;
    grid.fill(this.x - ext, this.y - ext, this.x + ext, this.y + ext, sample, C.JELLY, glowA * 0.8 + 0.08, 4, pattern, this.x, this.y);
    // Scalloped rim.
    for (let v = -R; v <= R; v += grid.cw * 0.9) grid.putPx(this.x + rx * v, this.y + ry * v, '~', C.JELLY, glowA + 0.08, 5);

    for (const nodes of this.tentacles) {
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1], b = nodes[i];
        const f = 1 - i / nodes.length;
        grid.line(a.x, a.y, b.x, b.y, C.TENTACLE, (0.08 + f * 0.32) * dim + this.flash * 0.08, (0.06 + f * 0.28) * dim, 3);
      }
    }
    for (const nodes of this.arms) {
      for (let i = 1; i < nodes.length; i++) grid.putPx(nodes[i].x, nodes[i].y, i % 2 ? '{' : '}', C.JELLY, (0.4 - i * 0.04) * dim, 3);
    }
  }
}

/* ── Octopus ─────────────────────────────────────────────────── */

export class Octopus {
  x: number; y: number; vx = 0; vy = 0;
  angle = -Math.PI / 2;
  target: { x: number; y: number };
  arms: Node[][];
  nextJet = 0;
  jetAt = -9999;
  flash = 0;
  blinkUntil = 0;
  home: number;
  /** While escaping: the locked direction, when the escape ends, and the follow-up jets left. */
  escape: { angle: number; until: number; jets: number } | null = null;
  calmUntil = 0;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.home = y;
    this.target = { x, y: y - 100 };
    this.arms = Array.from({ length: 8 }, () => rope(x, y, 12));
  }

  shift(dy: number) {
    this.y += dy;
    this.target.y += dy;
    this.arms.forEach(a => shiftRope(a, dy));
  }

  /** Commits to one escape direction: ink, snap to face away, and a big jet. */
  private flee(w: World) {
    const p = w.pointer;
    let ex = this.x - p.x, ey = this.y - p.y;
    const ed = Math.hypot(ex, ey) || 1;
    ex /= ed; ey /= ed;
    // Swept by a fast-moving cursor: get pushed the way it was going, too.
    const pv = Math.hypot(p.vx, p.vy);
    if (pv > 2) { ex += (p.vx / pv) * 0.6; ey += (p.vy / pv) * 0.6; }
    // Don't flee into the side of the screen: bounce off it instead.
    const reach = 380;
    if (this.x + ex * reach < 50 || this.x + ex * reach > w.w - 50) ex = -ex * 0.6;
    const angle = Math.atan2(ey, ex) + rand(-0.15, 0.15);
    w.burst(this.x, this.y, 40, '#%@&*', C.INK, 1.2, 2800);
    this.flash = 1;
    this.angle = angle;
    this.escape = { angle, until: w.now + 1500, jets: 2 };
    this.jetAt = w.now;
    this.nextJet = w.now + 320;
    this.vx = Math.cos(angle) * 6.5;
    this.vy = Math.sin(angle) * 6.5;
  }

  update(w: World) {
    const { k, now } = w;
    const p = w.pointer;
    const pd = Math.hypot(this.x - p.x, this.y - p.y);

    if (!this.escape && now > this.calmUntil && pointerActive(w) && pd < 130) this.flee(w);

    if (this.escape) {
      // Hold the course: follow-up jets along the same line, gliding far between them.
      const e = this.escape;
      this.angle += angleTo(this.angle, e.angle) * 0.2 * k;
      if (e.jets > 0 && now > this.nextJet) {
        const power = e.jets === 2 ? 3.6 : 2.2;
        this.vx += Math.cos(e.angle) * power;
        this.vy += Math.sin(e.angle) * power;
        this.jetAt = now;
        this.nextJet = now + 360;
        e.jets--;
      }
      this.vx *= 0.982 ** k; this.vy *= 0.982 ** k;
      if (now > e.until) {
        // Settle in the new spot and don't startle again straight away.
        this.escape = null;
        this.calmUntil = now + 1800;
        this.home = Math.min(w.H - 80, Math.max(80, this.y));
        this.target = { x: this.x + Math.cos(this.angle) * 60, y: this.y + Math.sin(this.angle) * 60 };
        this.nextJet = now + rand(1200, 2200);
      }
    } else {
      if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 70 || Math.random() < 0.002 * k) {
        // Explore around its own patch of water.
        this.target = { x: rand(80, w.w - 80), y: Math.min(w.H - 80, Math.max(80, this.home + rand(-260, 260))) };
      }
      // Turn toward the target, then jet.
      const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      this.angle += angleTo(this.angle, want) * 0.035 * k;
      if (now > this.nextJet) {
        this.vx += Math.cos(this.angle) * 0.9;
        this.vy += Math.sin(this.angle) * 0.9;
        this.jetAt = now;
        this.nextJet = now + rand(1800, 3000);
      }
      this.vx *= 0.962 ** k; this.vy *= 0.962 ** k;
      const [bx, by] = boundsForce(this.x, this.y, w, 60);
      this.vx += bx * 2 * k; this.vy += by * 2 * k;
    }
    this.x += this.vx * k; this.y += this.vy * k;
    // Hard stop at the ocean walls so a long escape never leaves the screen sideways.
    if (this.x < 30) { this.x = 30; this.vx = Math.abs(this.vx) * 0.3; }
    if (this.x > w.w - 30) { this.x = w.w - 30; this.vx = -Math.abs(this.vx) * 0.3; }
    this.flash *= 0.97 ** k;
    if (Math.random() < 0.006 * k) this.blinkUntil = now + 150;

    // Arms trail behind; they spread while gliding and snap together on each jet.
    const dx = Math.cos(this.angle), dy = Math.sin(this.angle);
    const nx = -dy, ny = dx;
    const squeeze = Math.exp(-(now - this.jetAt) / 350);
    const baseX = this.x - dx * 14, baseY = this.y - dy * 14;
    this.arms.forEach((nodes, j) => {
      const s = -1 + (2 * j) / (this.arms.length - 1);
      stepRope(nodes, baseX + nx * s * 15, baseY + ny * s * 15, 8, k, 0.88, i => {
        const curl = Math.sin(w.t * 2.6 + i * 0.55 + j * 0.9) * 0.1 * (i / nodes.length) * (1 - squeeze);
        const spread = s * (0.05 - squeeze * 0.12);
        return [-dx * 0.14 + nx * (spread + curl), -dy * 0.14 + ny * (spread + curl)];
      });
    });
  }

  draw(w: World) {
    const { grid, dim } = w;
    const color = this.flash > 0.3 ? C.OCTO_FLASH : C.OCTO;
    const alpha = (0.36 + this.flash * 0.25) * dim;
    for (const nodes of this.arms) {
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1], b = nodes[i];
        const f = 1 - i / nodes.length;
        grid.line(a.x, a.y, b.x, b.y, color, alpha * (0.35 + f * 0.6), alpha * (0.3 + f * 0.5), 4);
        if (i % 3 === 0) grid.putPx(b.x + 2, b.y + 2, '°', color, alpha * 0.35, 3);
      }
    }
    // Mantle: an egg shape pointing the way it swims, with mottled spots.
    const dx = Math.cos(this.angle), dy = Math.sin(this.angle);
    const cx = this.x + dx * 12, cy = this.y + dy * 12;
    const a = 30, b = 22;
    const sample = (px: number, py: number) => {
      const u = (px - cx) * dx + (py - cy) * dy;
      const v = -(px - cx) * dy + (py - cy) * dx;
      const q = (u / a) ** 2 + (v / b) ** 2;
      if (q > 1) return -1;
      return shade(dx * (u / a) - dy * (v / b), dy * (u / a) + dx * (v / b));
    };
    const spots = (px: number, py: number, s: number) => (Math.sin(px * 0.9) * Math.sin(py * 0.7) > 0.75 && s > 0.25 ? 'o' : null);
    grid.fill(cx - a, cy - a, cx + a, cy + a, sample, color, alpha + 0.06, 5, spots, cx, cy);
    const blink = w.now < this.blinkUntil;
    for (const side of [-1, 1]) {
      grid.putPx(this.x - dx * 4 - dy * side * 12, this.y - dy * 4 + dx * side * 12, blink ? '-' : '@', C.EYE, Math.min(1, alpha * 1.2), 6);
    }
  }
}

/* ── Sea turtle ──────────────────────────────────────────────── */

export class Turtle {
  x: number; y: number; vx = 0; vy = 0;
  angle: number;
  phase = 0;
  target: { x: number; y: number };
  blinkUntil = 0;
  home: number;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.home = y;
    this.angle = x < 0 ? 0 : Math.PI;
    this.target = { x: x < 0 ? 400 : x - 400, y };
  }

  shift(dy: number) { this.y += dy; this.target.y += dy; }

  update(w: World) {
    const { k, now } = w;
    const p = w.pointer;
    const pdx = this.x - p.x, pdy = this.y - p.y, pd = Math.hypot(pdx, pdy) || 1;
    if (pointerActive(w) && pd < 170) {
      // Calmly turns away rather than bolting.
      this.target = { x: this.x + (pdx / pd) * 260, y: this.y + (pdy / pd) * 200 };
    } else if (pointerResting(w) && pd < 280 && pd > 150) {
      this.target = { x: p.x + (pdx / pd) * 130, y: p.y + (pdy / pd) * 130 };
    } else if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 80 || Math.random() < 0.0015 * k) {
      this.target = { x: rand(100, w.w - 100), y: Math.min(w.H - 100, Math.max(100, this.home + rand(-300, 300))) };
    }
    const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.angle += angleTo(this.angle, want) * 0.014 * k;
    // Power on the downstroke, glide on the recovery.
    this.phase += 0.032 * k;
    const power = Math.max(0, Math.sin(this.phase));
    this.vx += Math.cos(this.angle) * power * 0.022 * k;
    this.vy += Math.sin(this.angle) * power * 0.022 * k;
    this.vx *= 0.986 ** k; this.vy *= 0.986 ** k;
    this.x += this.vx * k; this.y += this.vy * k;
    if (Math.random() < 0.005 * k) this.blinkUntil = now + 160;
    const [bx, by] = boundsForce(this.x, this.y, w, 30);
    this.vx += bx * k; this.vy += by * k;
  }

  draw(w: World) {
    const { grid, dim } = w;
    const alpha = 0.4 * dim;
    const dx = Math.cos(this.angle), dy = Math.sin(this.angle);
    const nx = -dy, ny = dx;
    const a = 36, b = 27;

    // Flippers sweep from forward-out to back.
    for (const side of [-1, 1]) {
      const sweep = side * (1.9 - Math.sin(this.phase) * 0.95);
      const fa = this.angle + sweep;
      const sx = this.x + dx * a * 0.35 + nx * side * b * 0.7;
      const sy = this.y + dy * a * 0.35 + ny * side * b * 0.7;
      const ex = sx + Math.cos(fa) * 36, ey = sy + Math.sin(fa) * 36;
      grid.line(sx, sy, ex, ey, C.TURTLE, alpha, alpha * 0.7, 4);
      grid.line(sx + dx * 4, sy + dy * 4, ex + dx * 2, ey + dy * 2, C.TURTLE, alpha * 0.8, alpha * 0.5, 4);
      const rear = this.angle + side * (2.55 + Math.sin(this.phase + 1) * 0.3);
      const rx = this.x - dx * a * 0.6 + nx * side * b * 0.5, ry = this.y - dy * a * 0.6 + ny * side * b * 0.5;
      grid.line(rx, ry, rx + Math.cos(rear) * 16, ry + Math.sin(rear) * 16, C.TURTLE, alpha * 0.8, alpha * 0.5, 4);
    }

    // Head bobs gently ahead of the shell.
    const bob = Math.sin(this.phase * 0.5) * 2;
    const hx = this.x + dx * (a + 9) + nx * bob, hy = this.y + dy * (a + 9) + ny * bob;
    const head = (px: number, py: number) => {
      const ddx = (px - hx) / 11, ddy = (py - hy) / 10;
      return ddx * ddx + ddy * ddy > 1 ? -1 : shade(ddx, ddy);
    };
    grid.fill(hx - 12, hy - 12, hx + 12, hy + 12, head, C.TURTLE, alpha + 0.06, 5, undefined, hx, hy);
    let ex = nx, ey = ny;
    if (ey > 0) { ex = -ex; ey = -ey; }
    grid.putPx(hx + dx * 4 + ex * 4, hy + dy * 4 + ey * 4, w.now < this.blinkUntil ? '-' : 'o', C.EYE, Math.min(1, alpha * 1.25), 6);

    // Shell: domed, with plates outlined.
    const shell = (px: number, py: number) => {
      const u = (px - this.x) * dx + (py - this.y) * dy;
      const v = (px - this.x) * nx + (py - this.y) * ny;
      const q = (u / a) ** 2 + (v / b) ** 2;
      return q > 1 ? -1 : shade(dx * (u / a) + nx * (v / b), dy * (u / a) + ny * (v / b));
    };
    const plates = (px: number, py: number, s: number) => {
      const u = (px - this.x) * dx + (py - this.y) * dy;
      const v = (px - this.x) * nx + (py - this.y) * ny;
      const q = (u / a) ** 2 + (v / b) ** 2;
      if (q > 0.72) return s > 0.5 ? '=' : '-';
      const row = Math.floor(u / 15 + 10);
      const fu = ((u / 15) % 1 + 1) % 1;
      const fv = (((v + (row % 2) * 8) / 16) % 1 + 1) % 1;
      return fu < 0.18 || fv < 0.16 ? '#' : null;
    };
    grid.fill(this.x - a, this.y - a, this.x + a, this.y + a, shell, C.SHELL, alpha + 0.08, 5, plates, this.x, this.y);
  }
}
