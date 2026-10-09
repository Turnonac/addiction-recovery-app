/**
 * Procedural, deterministic geometry for the brain illustration's sulci: each
 * main sulcus is a smooth spline that gets an organic wiggle and short side
 * branches, which reads much more like cortex than plain curves. Everything is
 * computed once at module load and returned as SVG path strings.
 */
export type Pt = readonly [number, number];

/** Small seeded PRNG (mulberry32) so the drawing is identical on every render. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catmull-Rom spline through `points`, sampled densely. */
function spline(points: readonly Pt[], samplesPerSegment = 12): Pt[] {
  if (points.length < 2) return [...points];
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Resample a polyline at a fixed arc-length step. */
function resample(line: Pt[], step: number): Pt[] {
  if (line.length < 2) return line;
  const out: Pt[] = [line[0]];
  let carry = 0;
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1];
    const [x1, y1] = line[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    let d = step - carry;
    while (d <= seg) {
      const t = d / seg;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      d += step;
    }
    carry = seg - (d - step);
  }
  const last = line[line.length - 1];
  const prev = out[out.length - 1];
  if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) > step * 0.3) out.push(last);
  return out;
}

function normalAt(pts: Pt[], i: number): Pt {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [-dy / len, dx / len];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function toPath(pts: Pt[]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${r1(x)} ${r1(y)}`).join(' ');
}

export interface SulcusOptions {
  /** Wiggle amplitude in px. */
  amp?: number;
  /** Wiggle wavelength in px. */
  wavelength?: number;
  /** Distance between side branches in px (0 = none). */
  branchEvery?: number;
  /** Branch length range in px. */
  branchLength?: readonly [number, number];
  seed?: number;
}

/** One organic sulcus: the wiggly main groove plus short alternating side branches. */
export function sulcus(points: readonly Pt[], opts: SulcusOptions = {}): string[] {
  const { amp = 2.6, wavelength = 18, branchEvery = 0, branchLength = [6, 12], seed = 1 } = opts;
  const rand = seededRandom(seed);
  const base = resample(spline(points), 2.5);
  const phase = rand() * Math.PI * 2;
  let dist = 0;
  const main: Pt[] = base.map((p, i) => {
    if (i > 0) dist += Math.hypot(p[0] - base[i - 1][0], p[1] - base[i - 1][1]);
    const [nx, ny] = normalAt(base, i);
    // Taper the wiggle at both ends so grooves start and stop smoothly.
    const edge = Math.min(1, i / 4, (base.length - 1 - i) / 4);
    const k = Math.sin((dist / wavelength) * Math.PI * 2 + phase) * (0.65 + 0.35 * Math.sin(dist / (wavelength * 2.7) + phase * 1.7));
    return [p[0] + nx * amp * k * edge, p[1] + ny * amp * k * edge];
  });

  const paths = [toPath(main)];
  if (branchEvery > 0) {
    let side = rand() > 0.5 ? 1 : -1;
    let next = branchEvery * (0.6 + rand() * 0.5);
    let travelled = 0;
    for (let i = 1; i < main.length - 2; i++) {
      travelled += Math.hypot(main[i][0] - main[i - 1][0], main[i][1] - main[i - 1][1]);
      if (travelled < next) continue;
      next = travelled + branchEvery * (0.7 + rand() * 0.6);
      const [nx, ny] = normalAt(main, i);
      const tx = ny;
      const ty = -nx;
      const len = branchLength[0] + rand() * (branchLength[1] - branchLength[0]);
      const lean = (rand() - 0.5) * 0.9;
      const [x0, y0] = main[i];
      const ex = x0 + (nx * side + tx * lean) * len;
      const ey = y0 + (ny * side + ty * lean) * len;
      const bend = (rand() - 0.5) * len * 0.8;
      const cx = (x0 + ex) / 2 + tx * bend;
      const cy = (y0 + ey) / 2 + ty * bend;
      paths.push(`M ${r1(x0)} ${r1(y0)} Q ${r1(cx)} ${r1(cy)} ${r1(ex)} ${r1(ey)}`);
      side = -side;
    }
  }
  return paths;
}

/** Build many sulci at once with incrementing seeds. */
export function sulci(defs: { points: readonly Pt[]; opts?: SulcusOptions }[], seedBase: number): string[] {
  return defs.flatMap((d, i) => sulcus(d.points, { seed: seedBase + i * 7, ...d.opts }));
}
