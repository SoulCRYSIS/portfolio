/* ───────────────────────────────────────────────────────────────
   ASCII frame buffer: a grid of character cells that creatures
   are rasterised into, then drawn with cached glyph images.
   ─────────────────────────────────────────────────────────────── */

// Muted on purpose: the ocean is a background, so nothing should compete with the content.
export const COLORS = [
  '150, 210, 195', // 0 water
  '160, 215, 180', // 1 water lit
  '172, 220, 165', // 2
  '185, 225, 150', // 3 water fully lit
  '165, 200, 140', // 4 minnow
  '130, 168, 200', // 5 tang
  '205, 160, 135', // 6 snapper
  '135, 155, 170', // 7 shark
  '180, 165, 215', // 8 jelly bell
  '155, 142, 198', // 9 jelly tentacles
  '200, 145, 140', // 10 octopus
  '220, 195, 125', // 11 octopus flash
  '140, 182, 150', // 12 turtle skin
  '178, 165, 125', // 13 turtle shell
  '205, 220, 212', // 14 eyes
  '220, 190, 135', // 15 food
  '165, 205, 215', // 16 bubbles
  '128, 110, 165', // 17 ink
  '110, 185, 158', // 18 seaweed
  '205, 185, 150', // 19 sand
  '205, 145, 130', // 20 crab
  '205, 162, 125', // 21 starfish
];

export const C = {
  WATER: 0, MINNOW: 4, TANG: 5, SNAPPER: 6, SHARK: 7, JELLY: 8, TENTACLE: 9, OCTO: 10, OCTO_FLASH: 11,
  TURTLE: 12, SHELL: 13, EYE: 14, FOOD: 15, BUBBLE: 16, INK: 17, WEED: 18, SAND: 19, CRAB: 20, STAR: 21,
} as const;

/** Characters from dim to bright, used to shade bodies. */
export const RAMP = '.:-=+*#%@';
/** Softer set for the inside of outlined bodies. */
const INTERIOR = '.:-=+*#';

// Light comes from the upper left, slightly toward the viewer.
const LIGHT = (() => {
  const [x, y, z] = [-0.45, -0.65, 0.62];
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
})();

/** Lambert shading for a point on a rounded body, given its 2D surface normal (length ≤ 1). */
export function shade(nx: number, ny: number) {
  const h = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return Math.min(1, Math.max(0, nx * LIGHT.x + ny * LIGHT.y + h * LIGHT.z) * 1.15);
}

/** The ASCII stroke that best follows a direction. */
export function dirChar(dx: number, dy: number) {
  let a = Math.atan2(dy, dx);
  if (a < 0) a += Math.PI;
  if (a < Math.PI / 8 || a >= (7 * Math.PI) / 8) return '-';
  if (a < (3 * Math.PI) / 8) return '\\';
  if (a < (5 * Math.PI) / 8) return '|';
  return '/';
}

export class Grid {
  /** Vertical offset of the viewport inside the ocean: creature methods take ocean coordinates. */
  oy = 0;
  cols = 0;
  rows = 0;
  cw = 6;
  ch = 11;
  chars: string[] = [];
  color = new Uint8Array(0);
  alpha = new Float32Array(0);
  z = new Int8Array(0);

  resize(width: number, height: number, cw: number, ch: number) {
    this.cw = cw;
    this.ch = ch;
    this.cols = Math.ceil(width / cw);
    this.rows = Math.ceil(height / ch);
    const n = this.cols * this.rows;
    this.chars = new Array<string>(n).fill(' ');
    this.color = new Uint8Array(n);
    this.alpha = new Float32Array(n);
    this.z = new Int8Array(n).fill(-1);
  }

  clear() { this.z.fill(-1); }

  /** Writes a cell unless something nearer (higher z) or brighter at the same z is already there. */
  put(col: number, row: number, char: string, color: number, alpha: number, z: number) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows || alpha < 0.015) return;
    const i = row * this.cols + col;
    const current = this.z[i];
    if (z < current || (z === current && alpha <= this.alpha[i])) return;
    this.chars[i] = char;
    this.color[i] = color;
    this.alpha[i] = alpha;
    this.z[i] = z;
  }

  putPx(x: number, y: number, char: string, color: number, alpha: number, z: number) {
    this.put(Math.floor(x / this.cw), Math.floor((y - this.oy) / this.ch), char, color, alpha, z);
  }

  /** A stroke between two points, fading from a0 to a1. */
  line(x0: number, y0: number, x1: number, y1: number, color: number, a0: number, a1: number, z: number, char?: string) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (Math.min(this.cw, this.ch) * 0.8)));
    const c = char ?? dirChar(dx, dy);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.putPx(x0 + dx * t, y0 + dy * t, c, color, a0 + (a1 - a0) * t, z);
    }
  }

  text(x: number, y: number, str: string, color: number, alpha: number, z: number) {
    const col = Math.floor(x / this.cw);
    const row = Math.floor((y - this.oy) / this.ch);
    for (let i = 0; i < str.length; i++) if (str[i] !== ' ') this.put(col + i, row, str[i], color, alpha, z);
  }

  private mask = new Float32Array(0);

  /**
   * Rasterises a shape: `sample` returns a shade in [0, 1] for points inside it, or a negative number outside.
   * Edge cells get a stroke that follows the silhouette (/ \ | _ -), so shapes read clearly;
   * inside cells get a soft shaded fill. `pattern` can replace interior characters (stripes, plates, spots).
   */
  fill(
    x0: number, y0: number, x1: number, y1: number,
    sample: (px: number, py: number) => number,
    color: number, alpha: number, z: number,
    pattern?: (px: number, py: number, s: number) => string | null,
  ) {
    // Pad by one cell so edges at the bounding box are detected.
    const c0 = Math.floor(x0 / this.cw) - 1;
    const c1 = Math.floor(x1 / this.cw) + 1;
    const r0 = Math.floor((y0 - this.oy) / this.ch) - 1;
    const r1 = Math.floor((y1 - this.oy) / this.ch) + 1;
    if (c1 < 0 || r1 < 0 || c0 >= this.cols || r0 >= this.rows) return;
    const w = c1 - c0 + 1;
    const h = r1 - r0 + 1;
    if (this.mask.length < w * h) this.mask = new Float32Array(w * h * 2);
    const mask = this.mask;
    for (let r = 0; r < h; r++) {
      const py = (r0 + r + 0.5) * this.ch + this.oy;
      for (let c = 0; c < w; c++) mask[r * w + c] = sample((c0 + c + 0.5) * this.cw, py);
    }
    const out = (c: number, r: number) => (c < 0 || r < 0 || c >= w || r >= h || mask[r * w + c] < 0 ? 1 : 0);
    for (let r = 1; r < h - 1; r++) {
      for (let c = 1; c < w - 1; c++) {
        const s = mask[r * w + c];
        if (s < 0) continue;
        const n = out(c, r - 1), so = out(c, r + 1), e = out(c + 1, r), wv = out(c - 1, r);
        const col = c0 + c;
        const row = r0 + r;
        if (n + so + e + wv > 0) {
          // Outward normal from the empty neighbours; the stroke runs along the tangent.
          const ne = out(c + 1, r - 1), nw = out(c - 1, r - 1), se = out(c + 1, r + 1), sw = out(c - 1, r + 1);
          const nx = e - wv + 0.6 * (ne + se - nw - sw);
          const ny = so - n + 0.6 * (se + sw - ne - nw);
          let char: string;
          if (Math.abs(nx) < 0.3 && Math.abs(ny) < 0.3) char = 'o';
          else if (Math.abs(ny) > Math.abs(nx) * 2.2) char = ny < 0 ? '_' : '-';
          else if (Math.abs(nx) > Math.abs(ny) * 2.2) char = '|';
          else char = nx * ny > 0 ? '/' : '\\';
          this.put(col, row, char, color, alpha * (0.75 + 0.25 * s), z);
        } else {
          const px = (col + 0.5) * this.cw, py = (row + 0.5) * this.ch + this.oy;
          const char = pattern?.(px, py, s) ?? INTERIOR[Math.min(INTERIOR.length - 1, Math.floor(s * INTERIOR.length))];
          this.put(col, row, char, color, alpha * (0.3 + 0.55 * s), z);
        }
      }
    }
  }
}

/**
 * Free-positioned glyphs for creatures. Unlike Grid, nothing snaps to fixed screen cells:
 * shapes are sampled on a lattice anchored to the creature itself and strokes are placed
 * at exact positions, so animals glide smoothly instead of jumping a cell at a time.
 * Same drawing API as Grid; glyphs are drawn in z order.
 */
export class Layer {
  oy = 0;
  cw = 6;
  ch = 11;
  width = 0;
  height = 0;
  private buckets = Array.from({ length: 10 }, () => ({ n: 0, x: [] as number[], y: [] as number[], c: [] as string[], col: [] as number[], a: [] as number[] }));
  private mask = new Float32Array(0);

  resize(width: number, height: number, cw: number, ch: number) {
    this.width = width;
    this.height = height;
    this.cw = cw;
    this.ch = ch;
  }

  clear() { for (const b of this.buckets) b.n = 0; }

  /** Adds a glyph centred on (x, y) in ocean coordinates. */
  putPx(x: number, y: number, char: string, color: number, alpha: number, z: number) {
    const sy = y - this.oy;
    if (alpha < 0.015 || x < -20 || x > this.width + 20 || sy < -20 || sy > this.height + 20) return;
    const b = this.buckets[Math.max(0, Math.min(9, z))];
    const i = b.n++;
    b.x[i] = x; b.y[i] = sy; b.c[i] = char; b.col[i] = color; b.a[i] = alpha;
  }

  /** A stroke between two points, with glyphs spaced one cell apart along it. */
  line(x0: number, y0: number, x1: number, y1: number, color: number, a0: number, a1: number, z: number, char?: string) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) { this.putPx(x0, y0, char ?? '.', color, a0, z); return; }
    const c = char ?? dirChar(dx, dy);
    const step = Math.min(this.cw / Math.max(0.001, Math.abs(dx) / len), this.ch / Math.max(0.001, Math.abs(dy) / len)) * 0.9;
    const n = Math.max(1, Math.round(len / step));
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      this.putPx(x0 + dx * t, y0 + dy * t, c, color, a0 + (a1 - a0) * t, z);
    }
  }

  text(x: number, y: number, str: string, color: number, alpha: number, z: number) {
    for (let i = 0; i < str.length; i++) if (str[i] !== ' ') this.putPx(x + i * this.cw, y, str[i], color, alpha, z);
  }

  /** Same contract as Grid.fill; the sampling lattice is anchored at (ax, ay) so it moves with the creature. */
  fill(
    x0: number, y0: number, x1: number, y1: number,
    sample: (px: number, py: number) => number,
    color: number, alpha: number, z: number,
    pattern?: (px: number, py: number, s: number) => string | null,
    ax = x0, ay = y0,
  ) {
    const { cw, ch } = this;
    if (x1 < -40 || x0 > this.width + 40 || y1 - this.oy < -40 || y0 - this.oy > this.height + 40) return;
    const c0 = Math.floor((x0 - ax) / cw) - 1;
    const c1 = Math.ceil((x1 - ax) / cw) + 1;
    const r0 = Math.floor((y0 - ay) / ch) - 1;
    const r1 = Math.ceil((y1 - ay) / ch) + 1;
    const w = c1 - c0 + 1;
    const h = r1 - r0 + 1;
    if (this.mask.length < w * h) this.mask = new Float32Array(w * h * 2);
    const mask = this.mask;
    for (let r = 0; r < h; r++) {
      const py = ay + (r0 + r) * ch;
      for (let c = 0; c < w; c++) mask[r * w + c] = sample(ax + (c0 + c) * cw, py);
    }
    const out = (c: number, r: number) => (c < 0 || r < 0 || c >= w || r >= h || mask[r * w + c] < 0 ? 1 : 0);
    for (let r = 1; r < h - 1; r++) {
      for (let c = 1; c < w - 1; c++) {
        const s = mask[r * w + c];
        if (s < 0) continue;
        const px = ax + (c0 + c) * cw;
        const py = ay + (r0 + r) * ch;
        const n = out(c, r - 1), so = out(c, r + 1), e = out(c + 1, r), wv = out(c - 1, r);
        if (n + so + e + wv > 0) {
          const ne = out(c + 1, r - 1), nw = out(c - 1, r - 1), se = out(c + 1, r + 1), sw = out(c - 1, r + 1);
          const nx = e - wv + 0.6 * (ne + se - nw - sw);
          const ny = so - n + 0.6 * (se + sw - ne - nw);
          let char: string;
          if (Math.abs(nx) < 0.3 && Math.abs(ny) < 0.3) char = 'o';
          else if (Math.abs(ny) > Math.abs(nx) * 2.2) char = ny < 0 ? '_' : '-';
          else if (Math.abs(nx) > Math.abs(ny) * 2.2) char = '|';
          else char = nx * ny > 0 ? '/' : '\\';
          this.putPx(px, py, char, color, alpha * (0.75 + 0.25 * s), z);
        } else {
          const char = pattern?.(px, py, s) ?? INTERIOR[Math.min(INTERIOR.length - 1, Math.floor(s * INTERIOR.length))];
          this.putPx(px, py, char, color, alpha * (0.3 + 0.55 * s), z);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, glyphs: Glyphs) {
    const { w, h } = glyphs.size;
    for (const b of this.buckets) {
      for (let i = 0; i < b.n; i++) {
        ctx.globalAlpha = Math.min(1, b.a[i]);
        ctx.drawImage(glyphs.get(b.col[i], b.c[i]), b.x[i] - w / 2, b.y[i] - h / 2, w, h);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Each (colour, character) pair is drawn once into a small canvas, then copied with drawImage. */
export class Glyphs {
  private cache: Map<string, HTMLCanvasElement>[] = COLORS.map(() => new Map());
  private pad = 2;
  constructor(private font: string, private cw: number, private ch: number, private dpr: number) {}

  /** Size of one glyph image in CSS pixels (a cell plus padding). */
  get size() { return { w: this.cw + this.pad * 2, h: this.ch + this.pad * 2 }; }

  get(color: number, char: string) {
    const map = this.cache[color];
    let image = map.get(char);
    if (!image) {
      image = document.createElement('canvas');
      const w = this.cw + this.pad * 2;
      const h = this.ch + this.pad * 2;
      image.width = Math.ceil(w * this.dpr);
      image.height = Math.ceil(h * this.dpr);
      const g = image.getContext('2d');
      if (g) {
        g.scale(this.dpr, this.dpr);
        g.font = this.font;
        g.textBaseline = 'middle';
        g.textAlign = 'center';
        g.fillStyle = `rgb(${COLORS[color]})`;
        g.fillText(char, w / 2, h / 2 + 0.5);
      }
      map.set(char, image);
    }
    return image;
  }

  draw(ctx: CanvasRenderingContext2D, grid: Grid) {
    const { cols, rows, cw, ch, z, chars, color, alpha } = grid;
    const w = cw + this.pad * 2;
    const h = ch + this.pad * 2;
    for (let r = 0; r < rows; r++) {
      const y = r * ch - this.pad;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (z[i] < 0) continue;
        ctx.globalAlpha = Math.min(1, alpha[i]);
        ctx.drawImage(this.get(color[i], chars[i]), c * cw - this.pad, y, w, h);
      }
    }
    ctx.globalAlpha = 1;
  }
}
