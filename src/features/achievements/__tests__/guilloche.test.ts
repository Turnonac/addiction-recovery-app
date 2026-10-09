import { ringPath, rosettePath, wavePath } from '../guilloche';

function points(path: string): [number, number][] {
  return path
    .replace(/Z$/, '')
    .split(/[ML]/)
    .filter(Boolean)
    .map((p) => p.trim().split(' ').map(Number) as [number, number]);
}

describe('guilloche paths', () => {
  it('rosette is closed and stays within its radius', () => {
    const d = rosettePath(100, 120, 80, 7, 3, 0.9);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    const pts = points(d);
    const [fx, fy] = pts[0];
    const [lx, ly] = pts[pts.length - 1];
    expect(Math.hypot(fx - lx, fy - ly)).toBeLessThan(0.5);
    for (const [x, y] of pts) expect(Math.hypot(x - 100, y - 120)).toBeLessThanOrEqual(80.01);
  });

  it('ring stays within r0 ± amplitude and closes', () => {
    const pts = points(ringPath(50, 50, 30, 4, 12, 0.5));
    for (const [x, y] of pts) {
      const d = Math.hypot(x - 50, y - 50);
      expect(d).toBeGreaterThanOrEqual(25.99);
      expect(d).toBeLessThanOrEqual(34.01);
    }
    const [f, l] = [pts[0], pts[pts.length - 1]];
    expect(Math.hypot(f[0] - l[0], f[1] - l[1])).toBeLessThan(0.05);
  });

  it('wave spans x0..x1 with the given amplitude', () => {
    const pts = points(wavePath(10, 110, 50, 4, 20));
    expect(pts[0][0]).toBe(10);
    expect(pts[pts.length - 1][0]).toBe(110);
    const ys = pts.map((p) => p[1]);
    expect(Math.max(...ys)).toBeLessThanOrEqual(54.01);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(45.99);
  });
});
