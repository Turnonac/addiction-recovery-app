import { getHealthTimeline, healthProgress, type HealthMilestone } from '@/domain/catalog/health';
import { DAY, HOUR, MINUTE, YEAR } from '@/domain/time';
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

describe('getHealthTimeline', () => {
  it.each(KINDS)('%s has 7–12 sorted, unique, complete milestones', (kind) => {
    const t = getHealthTimeline(kind);
    expect(t.length).toBeGreaterThanOrEqual(7);
    expect(t.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < t.length; i++) expect(t[i].afterMs).toBeGreaterThan(t[i - 1].afterMs);
    expect(new Set(t.map((m) => m.id)).size).toBe(t.length);
    for (const m of t) {
      expect(m.title.length).toBeGreaterThan(3);
      expect(m.description.length).toBeGreaterThan(20);
      expect(m.icon).toBeTruthy();
      expect(m.afterMs).toBeGreaterThan(0);
    }
  });

  it('follows the WHO/CDC smoking timeline', () => {
    const t = getHealthTimeline('smoking');
    expect(t[0].afterMs).toBe(20 * MINUTE);
    expect(t[1].afterMs).toBe(8 * HOUR);
    expect(t[t.length - 1].afterMs).toBe(15 * YEAR);
    expect(t.find((m) => m.afterMs === YEAR)?.title).toMatch(/heart/i);
  });

  it('includes "Natural energy" for caffeine', () => {
    const t = getHealthTimeline('caffeine');
    expect(t).toHaveLength(7);
    expect(t.find((m) => m.title === 'Natural energy')?.description).toBe('Your body’s natural energy systems work without caffeine.');
  });

  it('falls back to the generic timeline for unknown kinds', () => {
    expect(getHealthTimeline('nope' as HabitKind)).toBe(getHealthTimeline('custom'));
  });
});

describe('healthProgress', () => {
  const t: HealthMilestone[] = [
    { id: 'a', afterMs: 1 * DAY, title: 'A', description: '', icon: 'check' },
    { id: 'b', afterMs: 3 * DAY, title: 'B', description: '', icon: 'check' },
    { id: 'c', afterMs: 10 * DAY, title: 'C', description: '', icon: 'check' },
  ];

  it('handles a fresh start', () => {
    const p = healthProgress(t, 0);
    expect(p.achieved).toBe(0);
    expect(p.total).toBe(3);
    expect(p.lastAchieved).toBeNull();
    expect(p.current?.milestone.id).toBe('a');
    expect(p.current?.fraction).toBe(0);
    expect(p.current?.msRemaining).toBe(DAY);
  });

  it('treats negative clean time as zero', () => {
    expect(healthProgress(t, -5 * DAY).current?.msRemaining).toBe(DAY);
  });

  it('counts a milestone as reached exactly at its time', () => {
    const p = healthProgress(t, 3 * DAY);
    expect(p.achieved).toBe(2);
    expect(p.lastAchieved?.milestone.id).toBe('b');
    expect(p.lastAchieved?.index).toBe(1);
    expect(p.current?.milestone.id).toBe('c');
    expect(p.current?.index).toBe(2);
    expect(p.current?.fraction).toBeCloseTo(0.3);
    expect(p.current?.msRemaining).toBe(7 * DAY);
  });

  it('reports completion', () => {
    const p = healthProgress(t, 30 * DAY);
    expect(p.achieved).toBe(3);
    expect(p.current).toBeNull();
    expect(p.lastAchieved?.milestone.id).toBe('c');
  });

  it('handles an empty timeline', () => {
    expect(healthProgress([], DAY)).toEqual({ achieved: 0, total: 0, current: null, lastAchieved: null });
  });

  it('matches the reference coffee card (5 / 7, next in 1mo 28d)', () => {
    const streak = 31 * DAY + 3 * HOUR + 17 * MINUTE;
    const p = healthProgress(getHealthTimeline('caffeine'), streak);
    expect(`${p.achieved} / ${p.total}`).toBe('5 / 7');
    expect(p.current?.milestone.title).toBe('Natural energy');
    expect(Math.floor((p.current?.msRemaining ?? 0) / DAY)).toBe(58);
  });
});
