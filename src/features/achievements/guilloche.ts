/** Path builders for the certificate's decorative guilloche linework (pure). */

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * Closed hypotrochoid (spirograph) curve centered at (cx, cy), scaled so its
 * outer radius is `radius`. `R`/`r` must be positive integers (R > r); `d` is
 * the pen offset relative to r (0..1.5).
 */
export function rosettePath(cx: number, cy: number, radius: number, R: number, r: number, d: number, steps = 720): string {
  const k = R - r;
  const pen = d * r;
  const turns = r / gcd(R, r);
  const scale = radius / (k + pen);
  const total = 2 * Math.PI * turns;
  const n = Math.max(32, Math.round(steps * turns));
  let path = '';
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * total;
    const x = cx + scale * (k * Math.cos(t) + pen * Math.cos((k / r) * t));
    const y = cy + scale * (k * Math.sin(t) - pen * Math.sin((k / r) * t));
    path += `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`;
  }
  return `${path}Z`;
}

/**
 * Closed "wavy circle": radius r0 modulated by a sine with `lobes` lobes.
 * Several of these with shifted phases weave the classic banknote rosette band.
 */
export function ringPath(cx: number, cy: number, r0: number, amplitude: number, lobes: number, phase = 0, steps = 360): string {
  let path = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const r = r0 + amplitude * Math.sin(lobes * t + phase);
    path += `${i === 0 ? 'M' : 'L'}${fmt(cx + r * Math.cos(t))} ${fmt(cy + r * Math.sin(t))}`;
  }
  return `${path}Z`;
}

/** Horizontal sine wave from x0 to x1 around baseline y. */
export function wavePath(x0: number, x1: number, y: number, amplitude: number, wavelength: number, phase = 0, step = 2): string {
  let path = '';
  const n = Math.max(1, Math.ceil((x1 - x0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const v = y + amplitude * Math.sin(((x - x0) / wavelength) * 2 * Math.PI + phase);
    path += `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(v)}`;
  }
  return path;
}
