import { DAY, HOUR } from '@/domain/time';
import type { Habit, Relapse, Unlocks } from '@/types';
import { cardScale, certKey, certificateListItems, certificateShareText, certificateStatus, fitFontSize, isCertificateDays, pastEarnedAt, titleCase } from '../certificateLogic';

const NOW = new Date(2026, 9, 9, 12, 0, 0).getTime();
const EMPTY: Unlocks = { achievements: {}, certificates: {}, celebrated: {} };

function habit(id: string, streakDays: number, extra: Partial<Habit> = {}): Habit {
  const startedAt = NOW - streakDays * DAY;
  return {
    id,
    kind: 'alcohol',
    name: id[0].toUpperCase() + id.slice(1),
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

function relapse(habitId: string, at: number, streakMs: number): Relapse {
  return { id: `${habitId}-${at}`, habitId, at, streakMs, triggers: [], mood: null, note: '' };
}

describe('certificateStatus', () => {
  it('earned by the current streak and unclaimed → claim, dated startedAt + days', () => {
    const h = habit('alcohol', 30 + 3 / 24);
    const s = certificateStatus(h, [], EMPTY, 30, NOW);
    expect(s.earned).toBe(true);
    expect(s.shouldClaim).toBe(true);
    expect(s.earnedAt).toBe(h.startedAt + 30 * DAY);
    expect(s.daysToGo).toBe(0);
    expect(s.progress).toBe(1);
  });

  it('locked: days to go are rounded up', () => {
    const h = habit('coffee', 29 + 3 / 24);
    const s = certificateStatus(h, [], EMPTY, 30, NOW);
    expect(s.earned).toBe(false);
    expect(s.shouldClaim).toBe(false);
    expect(s.earnedAt).toBeNull();
    expect(s.daysToGo).toBe(1);
    expect(s.unlocksAt).toBe(h.startedAt + 30 * DAY);
    expect(s.progress).toBeCloseTo((29 + 3 / 24) / 30, 5);
    expect(certificateStatus(habit('x', 0), [], EMPTY, 7, NOW).daysToGo).toBe(7);
  });

  it('claimed certificates stay earned after a relapse and keep their original date', () => {
    const h = habit('smoking', 2);
    const firstStart = NOW - 50 * DAY;
    const rel = relapse('smoking', NOW - 2 * DAY, 48 * DAY);
    const claimedAt = firstStart + 31 * DAY;
    const unlocks: Unlocks = { ...EMPTY, certificates: { [certKey('smoking', 30)]: claimedAt } };
    const s = certificateStatus(h, [rel], unlocks, 30, NOW);
    expect(s.earned).toBe(true);
    expect(s.shouldClaim).toBe(false);
    expect(s.claimedAt).toBe(claimedAt);
    expect(s.earnedAt).toBe(firstStart + 30 * DAY);
  });

  it('claimed and re-earned keeps the first date', () => {
    const h = habit('smoking', 40);
    const rel = relapse('smoking', NOW - 40 * DAY, 35 * DAY);
    const claimedAt = NOW - 45 * DAY;
    const unlocks: Unlocks = { ...EMPTY, certificates: { [certKey('smoking', 7)]: claimedAt } };
    const s = certificateStatus(h, [rel], unlocks, 7, NOW);
    expect(s.earnedAt).toBe(NOW - 75 * DAY + 7 * DAY);
  });

  it('claimed during the current streak uses the current streak date', () => {
    const h = habit('coffee', 31);
    const unlocks: Unlocks = { ...EMPTY, certificates: { [certKey('coffee', 7)]: NOW - 20 * DAY } };
    expect(certificateStatus(h, [], unlocks, 7, NOW).earnedAt).toBe(h.startedAt + 7 * DAY);
  });

  it('pastEarnedAt falls back to the claim time', () => {
    expect(pastEarnedAt([], 30, 123)).toBe(123);
    expect(pastEarnedAt([relapse('a', NOW, 5 * DAY)], 30, 123)).toBe(123);
  });
});

describe('certificateListItems', () => {
  it('lists new certificates first, then claimed ones newest first', () => {
    const alcohol = habit('alcohol', 30 + 3 / 24, { color: '#F59E0B' });
    const coffee = habit('coffee', 31, { color: '#B45309' });
    const unlocks: Unlocks = {
      ...EMPTY,
      certificates: { 'alcohol:7': NOW - 23 * DAY, 'coffee:7': NOW - 24 * DAY, 'coffee:30': NOW - DAY },
    };
    const items = certificateListItems([alcohol, coffee], unlocks, NOW);
    expect(items.map((i) => [i.key, i.isNew])).toEqual([
      ['alcohol:30', true],
      ['coffee:30', false],
      ['alcohol:7', false],
      ['coffee:7', false],
    ]);
    expect(items[0].habitColor).toBe('#F59E0B');
  });

  it('keeps claimed certificates of archived habits, but no new ones', () => {
    const h = habit('old', 100, { archived: true });
    const unlocks: Unlocks = { ...EMPTY, certificates: { 'old:7': NOW - 90 * DAY } };
    expect(certificateListItems([h], unlocks, NOW).map((i) => i.key)).toEqual(['old:7']);
  });

  it('hides non-standard certificate keys', () => {
    const h = habit('social', 10);
    const unlocks: Unlocks = { ...EMPTY, certificates: { 'social:3': NOW - DAY, 'social:7': NOW - 2 * DAY } };
    expect(certificateListItems([h], unlocks, NOW).map((i) => i.key)).toEqual(['social:7']);
  });

  it('is empty without certificates', () => {
    expect(certificateListItems([habit('a', 6 + 23 / 24)], EMPTY, NOW - HOUR)).toEqual([]);
  });
});

describe('isCertificateDays', () => {
  it('accepts only the standard certificate milestones', () => {
    for (const d of [7, 30, 90, 180, 365]) expect(isCertificateDays(d)).toBe(true);
    for (const d of [0, 1, 3, 14, 60, 730, 7.5, -7, NaN]) expect(isCertificateDays(d)).toBe(false);
  });
});

describe('copy helpers', () => {
  it('title-cases milestone labels', () => {
    expect(titleCase('1 month')).toBe('1 Month');
    expect(titleCase('2 weeks')).toBe('2 Weeks');
    expect(certificateShareText(30, '1 month', 'Alcohol')).toContain('"1 Month free from Alcohol"');
  });
});

describe('cardScale', () => {
  it('is 1 at or above the design width', () => {
    expect(cardScale(350, 350, 0.78)).toBe(1);
    expect(cardScale(500, 350, 0.78)).toBe(1);
  });

  it('scales down on narrow cards, never below the minimum', () => {
    expect(cardScale(288, 350, 0.78)).toBeCloseTo(288 / 350);
    expect(cardScale(200, 350, 0.78)).toBe(0.78);
  });

  it('falls back to 1 for unmeasured sizes', () => {
    expect(cardScale(0, 350, 0.78)).toBe(1);
    expect(cardScale(Number.NaN, 350, 0.78)).toBe(1);
  });
});

describe('fitFontSize', () => {
  it('keeps the full size for short text', () => {
    expect(fitFontSize('You', 260, 26, 15)).toBe(26);
    expect(fitFontSize('Kevin Kong', 260, 26, 15)).toBe(26);
  });

  it('shrinks longer text so it fits on one line', () => {
    const size = fitFontSize('Alexandra Richardson-Lee', 260, 26, 15);
    expect(size).toBeLessThan(26);
    expect(size).toBeGreaterThan(15);
    expect(24 * 0.58 * size).toBeLessThanOrEqual(260 + 1e-9);
  });

  it('stops at the minimum for very long text (which then wraps)', () => {
    expect(fitFontSize('Maximilian Alexander Featherstonehaugh-Smythe', 260, 26, 15)).toBe(15);
  });

  it('ignores surrounding whitespace and handles empty text / unknown width', () => {
    expect(fitFontSize('   ', 260, 26, 15)).toBe(26);
    expect(fitFontSize('Someone with a long name', 0, 26, 15)).toBe(26);
    expect(fitFontSize('  Kevin  ', 60, 26, 10)).toBeCloseTo(60 / (5 * 0.58));
  });
});
