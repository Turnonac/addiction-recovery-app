import { hashSeed, makeConfetti, seededRandom } from '../confetti';

describe('confetti', () => {
  const palette = ['#EF4444', '#22C55E', '#3B82F6'];

  it('is deterministic for a seed', () => {
    const a = makeConfetti({ count: 48, seed: 42, palette, width: 390, height: 844 });
    const b = makeConfetti({ count: 48, seed: 42, palette, width: 390, height: 844 });
    expect(a).toEqual(b);
    expect(makeConfetti({ count: 48, seed: 43, palette, width: 390, height: 844 })).not.toEqual(a);
  });

  it('produces the requested number of well-formed particles', () => {
    const ps = makeConfetti({ count: 60, seed: hashSeed('demo_alcohol:30'), palette, width: 390, height: 844 });
    expect(ps).toHaveLength(60);
    for (const p of ps) {
      expect(palette).toContain(p.color);
      expect(Math.abs(p.driftX)).toBeLessThanOrEqual(390 * 0.55);
      expect(p.fall).toBeGreaterThan(844 * 0.8);
      expect(p.delay).toBeGreaterThanOrEqual(0);
      expect(p.riseMs + p.fallMs).toBeLessThan(4000);
      expect(Math.abs(p.spin)).toBeGreaterThanOrEqual(360);
    }
    // goes both ways and uses several colors
    expect(ps.some((p) => p.driftX < 0)).toBe(true);
    expect(ps.some((p) => p.driftX > 0)).toBe(true);
    expect(new Set(ps.map((p) => p.color)).size).toBe(3);
  });

  it('falls back to white without a palette', () => {
    expect(makeConfetti({ count: 3, seed: 1, palette: [], width: 100, height: 100 }).every((p) => p.color === '#FFFFFF')).toBe(true);
  });

  it('seededRandom stays in [0, 1)', () => {
    const r = seededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});
