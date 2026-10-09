import { brainRecoveryStats, daysUntilRecovered, getBrainProfile, overallRecovery, regionRecovery } from '@/domain/catalog/brain';
import type { HabitKind } from '@/types';

const KINDS: HabitKind[] = [
  'smoking',
  'vaping',
  'alcohol',
  'pornography',
  'sugar',
  'junk_food',
  'caffeine',
  'gambling',
  'gaming',
  'social_media',
  'procrastination',
  'overeating',
  'custom',
];

describe('getBrainProfile', () => {
  it.each(KINDS)('%s has a summary and 3–6 valid regions', (kind) => {
    const p = getBrainProfile(kind);
    expect(p.summary.length).toBeGreaterThan(60);
    expect(p.regions.length).toBeGreaterThanOrEqual(3);
    expect(p.regions.length).toBeLessThanOrEqual(6);
    expect(new Set(p.regions.map((r) => r.id)).size).toBe(p.regions.length);
    for (const r of p.regions) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x).toBeLessThanOrEqual(1);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeLessThanOrEqual(1);
      expect(r.fullRecoveryDays).toBeGreaterThan(0);
      expect(r.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(r.description.length).toBeGreaterThan(30);
    }
  });

  it.each(KINDS)('%s markers are far enough apart to tap separately', (kind) => {
    // Illustration space is 400×300; 44 units ≈ 37pt on a 390pt-wide phone.
    const { regions } = getBrainProfile(kind);
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const d = Math.hypot((regions[i].x - regions[j].x) * 400, (regions[i].y - regions[j].y) * 300);
        expect({ pair: `${regions[i].id}/${regions[j].id}`, far: d >= 44 }).toEqual({ pair: `${regions[i].id}/${regions[j].id}`, far: true });
      }
    }
  });

  it('places the insula on the lateral fissure, below the frontal lobe', () => {
    const insula = getBrainProfile('sugar').regions.find((r) => r.id === 'insula')!;
    expect(insula.x).toBeGreaterThanOrEqual(0.44);
    expect(insula.x).toBeLessThanOrEqual(0.48);
    expect(insula.y).toBeGreaterThanOrEqual(0.55);
    expect(insula.y).toBeLessThanOrEqual(0.57);
  });

  it('falls back to the generic profile', () => {
    expect(getBrainProfile('nope' as HabitKind)).toBe(getBrainProfile('custom'));
  });
});

describe('regionRecovery', () => {
  it('is 0 at the start and 1 at full recovery', () => {
    expect(regionRecovery(0, 84)).toBe(0);
    expect(regionRecovery(84, 84)).toBe(1);
    expect(regionRecovery(400, 84)).toBe(1);
    expect(regionRecovery(-3, 84)).toBe(0);
  });

  it('eases out: early progress is faster than linear and monotonic', () => {
    expect(regionRecovery(42, 84)).toBeGreaterThan(0.5);
    let prev = 0;
    for (let d = 1; d <= 84; d++) {
      const v = regionRecovery(d, 84);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it('treats a non-positive recovery time as recovered', () => {
    expect(regionRecovery(0, 0)).toBe(1);
  });
});

describe('overall + stats', () => {
  it('averages regions', () => {
    expect(overallRecovery([], 10)).toBe(0);
    expect(overallRecovery([{ fullRecoveryDays: 10 }, { fullRecoveryDays: 10 }], 10)).toBe(1);
    expect(overallRecovery([{ fullRecoveryDays: 10 }, { fullRecoveryDays: 1000 }], 10)).toBeCloseTo((1 + regionRecovery(10, 1000)) / 2);
  });

  it('matches the reference smoking screen at day 29', () => {
    const days = 29 + (3 * 60 + 17) / 1440;
    const p = getBrainProfile('smoking');
    const nach = p.regions.find((r) => r.name === 'nACh receptors');
    expect(nach).toBeDefined();
    expect(Math.floor(regionRecovery(days, nach!.fullRecoveryDays) * 100)).toBe(65);
    const stats = brainRecoveryStats(p, days);
    expect(Math.floor(stats.overall * 100)).toBe(68);
    expect(stats).toMatchObject({ recovered: 2, recovering: 3, total: 5 });
  });

  it('counts days until recovered', () => {
    expect(daysUntilRecovered({ fullRecoveryDays: 84 }, 29.2)).toBe(55);
    expect(daysUntilRecovered({ fullRecoveryDays: 84 }, 90)).toBe(0);
    expect(daysUntilRecovered({ fullRecoveryDays: 84 }, -1)).toBe(84);
  });
});
