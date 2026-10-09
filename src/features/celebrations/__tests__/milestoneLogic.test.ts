import { DAY, HOUR } from '@/domain/time';
import type { Habit } from '@/types';
import { isCelebrationBlocked, isCelebrationRoute, isMilestoneReached, milestoneHref, planCelebrations } from '../milestoneLogic';

const NOW = new Date(2026, 9, 9, 12, 0, 0).getTime();
const keyFor = (id: string, startedAt: number, days: number) => `${id}:${startedAt}:${days}`;

function habit(id: string, startedAt: number, extra: Partial<Habit> = {}): Habit {
  return {
    id,
    kind: 'alcohol',
    name: id,
    color: '#F59E0B',
    icon: 'glass-wine',
    startedAt,
    firstStartedAt: startedAt,
    createdAt: startedAt,
    dailyCost: 0,
    currency: 'USD',
    dailyMinutes: 0,
    goalDays: null,
    reason: '',
    archived: false,
    order: 0,
    ...extra,
  };
}

describe('planCelebrations', () => {
  it('first run: marks everything and celebrates the highest milestone crossed in the last 24h', () => {
    const alcohol = habit('alcohol', NOW - 30 * DAY - 3 * HOUR);
    const smoking = habit('smoking', NOW - 29 * DAY);
    const plan = planCelebrations({ habits: [alcohol, smoking], celebrated: {}, now: NOW, windowStart: NOW - DAY, keyFor });
    expect(plan.celebrate).toEqual({ key: keyFor('alcohol', alcohol.startedAt, 30), habitId: 'alcohol', days: 30, crossedAt: alcohol.startedAt + 30 * DAY });
    // 1,3,7,14,30 for alcohol + 1,3,7,14 for smoking
    expect(plan.toMark).toHaveLength(9);
  });

  it('first run: old milestones are marked silently', () => {
    const smoking = habit('smoking', NOW - 29 * DAY);
    const plan = planCelebrations({ habits: [smoking], celebrated: {}, now: NOW, windowStart: NOW - DAY, keyFor });
    expect(plan.celebrate).toBeNull();
    expect(plan.toMark).toHaveLength(4);
  });

  it('later runs celebrate only milestones crossed since the last check', () => {
    const h = habit('a', NOW - 7 * DAY - 10_000);
    const celebrated = { [keyFor('a', h.startedAt, 1)]: true as const, [keyFor('a', h.startedAt, 3)]: true as const };
    const plan = planCelebrations({ habits: [h], celebrated, now: NOW, windowStart: NOW - 30_000, keyFor });
    expect(plan.celebrate?.days).toBe(7);
    expect(plan.toMark).toEqual([keyFor('a', h.startedAt, 7)]);
  });

  it('does not celebrate milestones that were reached by back-dating a habit', () => {
    const h = habit('a', NOW - 45 * DAY);
    const plan = planCelebrations({ habits: [h], celebrated: {}, now: NOW, windowStart: NOW - 30_000, keyFor });
    expect(plan.celebrate).toBeNull();
    expect(plan.toMark.length).toBe(5);
  });

  it('never repeats a celebrated milestone', () => {
    const h = habit('a', NOW - 7 * DAY - HOUR);
    const all = Object.fromEntries([1, 3, 7].map((d) => [keyFor('a', h.startedAt, d), true as const]));
    const plan = planCelebrations({ habits: [h], celebrated: all, now: NOW, windowStart: NOW - DAY, keyFor });
    expect(plan).toEqual({ toMark: [], celebrate: null });
  });

  it('picks only the highest across habits', () => {
    const a = habit('a', NOW - 7 * DAY - HOUR);
    const b = habit('b', NOW - 14 * DAY - 2 * HOUR);
    const plan = planCelebrations({ habits: [a, b], celebrated: {}, now: NOW, windowStart: NOW - DAY, keyFor });
    expect(plan.celebrate?.habitId).toBe('b');
    expect(plan.celebrate?.days).toBe(14);
  });

  it('a new streak after a relapse gets fresh keys', () => {
    const oldStart = NOW - 40 * DAY;
    const celebrated = Object.fromEntries([1, 3, 7, 14, 30].map((d) => [keyFor('a', oldStart, d), true as const]));
    const fresh = habit('a', NOW - DAY - HOUR);
    const plan = planCelebrations({ habits: [fresh], celebrated, now: NOW, windowStart: NOW - 2 * HOUR, keyFor });
    expect(plan.celebrate?.days).toBe(1);
  });

  it('ignores archived habits', () => {
    const plan = planCelebrations({ habits: [habit('a', NOW - DAY - HOUR, { archived: true })], celebrated: {}, now: NOW, windowStart: NOW - DAY, keyFor });
    expect(plan).toEqual({ toMark: [], celebrate: null });
  });
});

describe('isCelebrationBlocked', () => {
  it('blocks SOS, onboarding, celebrations and forms', () => {
    for (const p of ['/sos', '/sos/breathing_478', '/onboarding', '/milestone', '/certificate', '/habit/new', '/habit/abc/relapse', '/habit/abc/edit', '/journal/new', '', null]) {
      expect(isCelebrationBlocked(p)).toBe(true);
    }
  });

  it('allows regular screens', () => {
    for (const p of ['/', '/habit/abc', '/journal', '/journal/xyz', '/stats', '/achievements', '/weekly', '/settings', '/sosmething']) {
      expect(isCelebrationBlocked(p)).toBe(false);
    }
  });

  it('builds the milestone href', () => {
    expect(milestoneHref('demo_alcohol', 30)).toBe('/milestone?habitId=demo_alcohol&days=30');
  });
});

describe('isCelebrationRoute', () => {
  it('matches only the celebration screen', () => {
    expect(isCelebrationRoute('/milestone')).toBe(true);
    expect(isCelebrationRoute('/milestone/')).toBe(true);
    expect(isCelebrationRoute('/')).toBe(false);
    expect(isCelebrationRoute('/achievements')).toBe(false);
    expect(isCelebrationRoute('/milestones-list')).toBe(false);
    expect(isCelebrationRoute(null)).toBe(false);
    expect(isCelebrationRoute(undefined)).toBe(false);
  });
});

describe('isMilestoneReached', () => {
  const h = habit('a', NOW - 29 * DAY - 3 * HOUR);

  it('accepts milestones the current streak has reached', () => {
    expect(isMilestoneReached(h, 1, NOW)).toBe(true);
    expect(isMilestoneReached(h, 7, NOW)).toBe(true);
    expect(isMilestoneReached(h, 14, NOW)).toBe(true);
  });

  it('rejects milestones not reached yet or not milestones at all', () => {
    expect(isMilestoneReached(h, 30, NOW)).toBe(false);
    expect(isMilestoneReached(h, 730, NOW)).toBe(false);
    expect(isMilestoneReached(h, 5, NOW)).toBe(false);
    expect(isMilestoneReached(h, 0, NOW)).toBe(false);
    expect(isMilestoneReached(h, -7, NOW)).toBe(false);
    expect(isMilestoneReached(h, 7.5, NOW)).toBe(false);
    expect(isMilestoneReached(h, Number.NaN, NOW)).toBe(false);
  });

  it('accepts yearly milestones after the first year', () => {
    const veteran = habit('v', NOW - 800 * DAY);
    expect(isMilestoneReached(veteran, 365, NOW)).toBe(true);
    expect(isMilestoneReached(veteran, 730, NOW)).toBe(true);
    expect(isMilestoneReached(veteran, 1095, NOW)).toBe(false);
  });

  it('rejects missing and archived habits', () => {
    expect(isMilestoneReached(undefined, 7, NOW)).toBe(false);
    expect(isMilestoneReached(null, 7, NOW)).toBe(false);
    expect(isMilestoneReached({ ...h, archived: true }, 7, NOW)).toBe(false);
  });
});
