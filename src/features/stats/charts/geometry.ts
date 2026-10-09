/** Pure chart geometry helpers (no React), shared by the SVG charts. */

export interface Point {
  x: number;
  y: number;
}

/** Maps [d0, d1] onto [r0, r1]. A zero-width domain maps everything to r0. */
export function linearScale(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const span = d1 - d0;
  if (span === 0) return () => r0;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/** Straight polyline path. */
export function linePath(pts: Point[]): string {
  if (!pts.length) return '';
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ');
}

/**
 * Smooth path through the points using monotone cubic interpolation
 * (Fritsch–Carlson), so a cumulative series never visually dips or overshoots.
 */
export function monotonePath(pts: Point[]): string {
  const n = pts.length;
  if (n < 3) return linePath(pts);
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  m[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${f(pts[i].x + h)} ${f(pts[i].y + m[i] * h)} ${f(pts[i + 1].x - h)} ${f(pts[i + 1].y - m[i + 1] * h)} ${f(pts[i + 1].x)} ${f(pts[i + 1].y)}`;
  }
  return d;
}

/** Closes a line path down to `baseY` to make an area. */
export function areaPath(line: string, pts: Point[], baseY: number): string {
  if (!pts.length) return '';
  const last = pts[pts.length - 1];
  return `${line} L${f(last.x)} ${f(baseY)} L${f(pts[0].x)} ${f(baseY)} Z`;
}

/** Point on axis `i` of `n` (axis 0 at 12 o'clock, clockwise) at radius `r`. */
export function polar(cx: number, cy: number, r: number, i: number, n: number): Point {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Pie-slice path from axis `i` clockwise to axis `i + 1`, radius `r`. */
export function wedgePath(cx: number, cy: number, r: number, i: number, n: number): string {
  if (r <= 0) return '';
  const a = polar(cx, cy, r, i, n);
  const b = polar(cx, cy, r, i + 1, n);
  return `M${f(cx)} ${f(cy)} L${f(a.x)} ${f(a.y)} A${f(r)} ${f(r)} 0 0 1 ${f(b.x)} ${f(b.y)} Z`;
}

/** "x,y x,y …" for <Polygon points>. */
export function pointsAttr(pts: Point[]): string {
  return pts.map((p) => `${f(p.x)},${f(p.y)}`).join(' ');
}

/** `count + 1` evenly spaced values from 0 to max (inclusive). */
export function evenTicks(max: number, count: number = 4): number[] {
  const n = Math.max(1, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, i) => (max * i) / n);
}

/** Indices to label when only ~`maxLabels` fit: always first and last. */
export function labelIndices(n: number, maxLabels: number): number[] {
  if (n <= 0) return [];
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil((n - 1) / Math.max(1, maxLabels - 1));
  const out: number[] = [];
  for (let i = 0; i < n - 1; i += step) out.push(i);
  // Drop the label just before the last one when the two would sit too close together.
  if (n - 1 - out[out.length - 1] <= step / 2 && out.length > 1) out.pop();
  out.push(n - 1);
  return out;
}

/** Bar path with rounded top corners (radius clamped to the bar size), flat bottom. */
export function roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
  if (w <= 0 || h <= 0) return '';
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${f(x)} ${f(y + h)} L${f(x)} ${f(y + rr)} Q${f(x)} ${f(y)} ${f(x + rr)} ${f(y)} L${f(x + w - rr)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + rr)} L${f(x + w)} ${f(y + h)} Z`;
}

/**
 * Horizontal scroll offset that brings an item [x, x + width] fully into a viewport
 * (keeping `inset` padding plus a peek of the neighbour), or null if already visible.
 */
export function revealOffset(x: number, width: number, offset: number, viewport: number, inset: number): number | null {
  const peek = inset + 28;
  if (x - inset < offset) return Math.max(0, x - peek);
  if (x + width + inset > offset + viewport) return x + width + peek - viewport;
  return null;
}

/** Hue (0..360°) of a "#RRGGBB" color; null for grays and unparsable input. */
export function hueOf(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 0.08) return null;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** True when both colors are saturated and their hues lie within `maxDegrees` of each other. */
export function similarHue(a: string, b: string, maxDegrees: number): boolean {
  const ha = hueOf(a);
  const hb = hueOf(b);
  if (ha == null || hb == null) return false;
  const diff = Math.abs(ha - hb) % 360;
  return Math.min(diff, 360 - diff) <= maxDegrees;
}

/**
 * `color`, unless its hue lies within `maxDegrees` of a `reserved` color that means
 * something else in the chart (e.g. record gold); then `fallback`.
 */
export function distinctFrom(color: string, reserved: string, fallback: string, maxDegrees: number): string {
  return similarHue(color, reserved, maxDegrees) ? fallback : color;
}
