import {
  ACHIEVEMENTS,
  CATEGORY_ORDER,
  TIER_COLORS,
  achievementById,
  bestStreakAfterRelapses,
  bestStreakDays,
  distinctJournalDays,
  evaluateAll,
  hoursRegained,
  isUnlocked,
  mostImpressive,
  newlyUnlockedIds,
  nextClosest,
  progressText,
  savedByCurrency,
  type AchievementContext,
} from '../achievements';
import { DAY, HOUR } from '../time';
import type { Habit, JournalEntry, Relapse, SosSession } from '@/types';

const NOW = new Date(2026, 9, 9, 12, 0, 0).getTime();

function habit(id: string, streakDays: number, extra: Partial<Habit> = {}): Habit {
  const startedAt = NOW - streakDays * DAY;
  return {
    id,
    kind: 'smoking',
    name: id,
    color: '#EF4444',
    icon: 'smoking',
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

function relapse(habitId: string, daysAgo: number, streakDays: number, triggers: Relapse['triggers'] = []): Relapse {
  return { id: `${habitId}-${daysAgo}`, habitId, at: NOW - daysAgo * DAY, streakMs: streakDays * DAY, triggers, mood: null, note: '' };
}

function entry(id: string, daysAgo: number, hour = 10): JournalEntry {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return { id, createdAt: d.getTime(), updatedAt: d.getTime(), title: id, body: '', mood: 'sunny', habitId: null };
}

function session(id: string, exerciseId: SosSession['exerciseId'], completed = true): SosSession {
  return { id, at: NOW - DAY, exerciseId, durationSec: 60, completed, habitId: null, intensityBefore: null, intensityAfter: null };
}

function ctx(partial: Partial<AchievementContext> = {}): AchievementContext {
  return { habits: [], relapses: [], journal: [], sosSessions: [], now: NOW, ...partial };
}

function get(c: AchievementContext, id: string) {
  const r = evaluateAll(c).find((x) => x.def.id === id);
  if (!r) throw new Error(`missing ${id}`);
  return r;
}

describe('achievement catalog', () => {
  it('has a sensible number of unique, well-formed achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(24);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(30);
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(CATEGORY_ORDER).toContain(a.category);
      expect(TIER_COLORS[a.tier]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('every category has at least one achievement', () => {
    for (const c of CATEGORY_ORDER) expect(ACHIEVEMENTS.some((a) => a.category === c)).toBe(true);
  });

  it('nothing is unlocked for a brand-new user and progress stays in range', () => {
    const results = evaluateAll(ctx());
    expect(results.every((r) => !r.unlocked)).toBe(true);
    for (const r of results) {
      expect(r.progress).toBeGreaterThanOrEqual(0);
      expect(r.progress).toBeLessThan(1);
      expect(r.current).toBeLessThanOrEqual(r.target);
    }
  });
});

describe('getting started + streaks', () => {
  it('unlocks First step with any habit (archived included)', () => {
    expect(get(ctx({ habits: [habit('a', 0, { archived: true })] }), 'first_step').unlocked).toBe(true);
  });

  it('uses the longest current streak', () => {
    const c = ctx({ habits: [habit('a', 8.5), habit('b', 2)] });
    expect(get(c, 'streak_1').unlocked).toBe(true);
    expect(get(c, 'streak_3').unlocked).toBe(true);
    expect(get(c, 'streak_7').unlocked).toBe(true);
    const two = get(c, 'streak_14');
    expect(two.unlocked).toBe(false);
    expect(two.current).toBe(8);
    expect(two.progress).toBeCloseTo(8.5 / 14, 5);
    expect(progressText(two)).toBe('8 / 14 days');
  });

  it('counts record streaks that ended in a relapse', () => {
    const c = ctx({ habits: [habit('a', 2)], relapses: [relapse('a', 2, 95)] });
    expect(bestStreakDays(c)).toBeCloseTo(95, 5);
    expect(get(c, 'streak_90').unlocked).toBe(true);
    expect(get(c, 'streak_180').unlocked).toBe(false);
  });

  it('ignores archived habits for current streaks and relapses of deleted habits', () => {
    const c = ctx({ habits: [habit('a', 400, { archived: true })], relapses: [relapse('gone', 1, 500)] });
    expect(get(c, 'streak_365').unlocked).toBe(false);
    expect(bestStreakDays(c)).toBe(0);
  });

  it('caps the current value at the target once unlocked', () => {
    const r = get(ctx({ habits: [habit('a', 400)] }), 'streak_30');
    expect(r.unlocked).toBe(true);
    expect(r.progress).toBe(1);
    expect(r.current).toBe(30);
  });

  it('24 hours uses the singular unit', () => {
    expect(get(ctx({ habits: [habit('a', 0.5)] }), 'streak_1').unit).toBe('day');
  });

  it('Double down needs two habits at 7+ days at once', () => {
    expect(get(ctx({ habits: [habit('a', 10), habit('b', 6.9)] }), 'double_down').unlocked).toBe(false);
    const ok = get(ctx({ habits: [habit('a', 10), habit('b', 7)] }), 'double_down');
    expect(ok.unlocked).toBe(true);
    expect(ok.current).toBe(2);
  });

  it('Double down progress blends the two longest streaks', () => {
    const r = get(ctx({ habits: [habit('a', 14), habit('b', 3.5), habit('c', 1)] }), 'double_down');
    expect(r.current).toBe(1);
    expect(r.progress).toBeCloseTo((1 + 0.5) / 2, 5);
  });

  it('Triple threat needs three habits at 30+ days', () => {
    expect(get(ctx({ habits: [habit('a', 31), habit('b', 30), habit('c', 29)] }), 'triple_threat').unlocked).toBe(false);
    expect(get(ctx({ habits: [habit('a', 31), habit('b', 30), habit('c', 30)] }), 'triple_threat').unlocked).toBe(true);
  });
});

describe('resilience', () => {
  it('Comeback is not available without a relapse', () => {
    const r = get(ctx({ habits: [habit('a', 50)] }), 'comeback');
    expect(r.unlocked).toBe(false);
    expect(r.progress).toBe(0);
    expect(bestStreakAfterRelapses(ctx({ habits: [habit('a', 50)] }), 1)).toBeNull();
  });

  it('Comeback unlocks with 7 days on the attempt after a relapse', () => {
    const relapses = [relapse('a', 7.2, 40)];
    expect(get(ctx({ habits: [habit('a', 7.2)], relapses }), 'comeback').unlocked).toBe(true);
    const almost = get(ctx({ habits: [habit('a', 3.5)], relapses: [relapse('a', 3.5, 40)] }), 'comeback');
    expect(almost.unlocked).toBe(false);
    expect(almost.progress).toBeCloseTo(0.5, 5);
  });

  it('Comeback also counts an ended later attempt', () => {
    // first attempt 20d, second attempt 9d (ended by a 2nd relapse), current 1d
    const relapses = [relapse('a', 10, 20), relapse('a', 1, 9)];
    expect(get(ctx({ habits: [habit('a', 1)], relapses }), 'comeback').unlocked).toBe(true);
  });

  it('Phoenix needs 30 days after at least three relapses', () => {
    const three = [relapse('a', 60, 5), relapse('a', 50, 10), relapse('a', 29, 21)];
    const r = get(ctx({ habits: [habit('a', 29)], relapses: three }), 'phoenix');
    expect(r.unlocked).toBe(false);
    expect(r.current).toBe(29);
    expect(get(ctx({ habits: [habit('a', 30)], relapses: three.map((x) => ({ ...x, at: x.at - DAY })) }), 'phoenix').unlocked).toBe(true);
    // two relapses are not enough, however long the streak
    expect(get(ctx({ habits: [habit('a', 90)], relapses: three.slice(0, 2) }), 'phoenix').unlocked).toBe(false);
  });

  it('Honest requires a relapse with triggers', () => {
    expect(get(ctx({ habits: [habit('a', 1)], relapses: [relapse('a', 1, 3)] }), 'honest').unlocked).toBe(false);
    expect(get(ctx({ habits: [habit('a', 1)], relapses: [relapse('a', 1, 3, ['stress'])] }), 'honest').unlocked).toBe(true);
  });
});

describe('savings', () => {
  it('sums money per currency over all clean time of active habits', () => {
    const c = ctx({
      habits: [
        habit('a', 10, { dailyCost: 5, currency: 'USD' }),
        habit('b', 4, { dailyCost: 10, currency: 'USD' }),
        habit('c', 20, { dailyCost: 3, currency: 'EUR' }),
        habit('d', 20, { dailyCost: 100, currency: 'GBP', archived: true }),
      ],
      relapses: [relapse('a', 10, 6)],
    });
    const s = savedByCurrency(c);
    expect(s.USD).toBeCloseTo(5 * 16 + 10 * 4, 5);
    expect(s.EUR).toBeCloseTo(60, 5);
    expect(s.GBP).toBeUndefined();
  });

  it('Penny saver uses the best single currency (not a cross-currency sum)', () => {
    const c = ctx({ habits: [habit('a', 10, { dailyCost: 6, currency: 'USD' }), habit('b', 10, { dailyCost: 6, currency: 'EUR' })] });
    const r = get(c, 'saved_100');
    expect(r.unlocked).toBe(false);
    expect(r.current).toBe(60);
    expect(r.unit).toBe('USD');
    const rich = get(ctx({ habits: [habit('a', 30, { dailyCost: 120, currency: 'UAH' })] }), 'saved_1000');
    expect(rich.unlocked).toBe(true);
    expect(progressText(rich)).toBe('1,000 / 1,000 UAH');
  });

  it('Fortune needs 10,000', () => {
    expect(get(ctx({ habits: [habit('a', 99, { dailyCost: 100 })] }), 'saved_10000').unlocked).toBe(false);
    expect(get(ctx({ habits: [habit('a', 100, { dailyCost: 100 })] }), 'saved_10000').unlocked).toBe(true);
  });

  it('measures hours regained', () => {
    const c = ctx({ habits: [habit('a', 12, { dailyMinutes: 120 })] });
    expect(hoursRegained(c)).toBeCloseTo(24, 5);
    expect(get(c, 'hours_24').unlocked).toBe(true);
    const life = get(c, 'hours_100');
    expect(life.current).toBe(24);
    expect(life.unit).toBe('hours');
  });

  it('has no unit currency when nothing is tracked', () => {
    const r = get(ctx({ habits: [habit('a', 5)] }), 'saved_100');
    expect(r.current).toBe(0);
    expect(r.unit).toBe('saved');
  });
});

describe('journal + SOS', () => {
  it('counts journal entries', () => {
    const journal = Array.from({ length: 10 }, (_, i) => entry(`j${i}`, 0, 8 + i));
    const c = ctx({ journal });
    expect(get(c, 'journal_1').unlocked).toBe(true);
    expect(get(c, 'journal_10').unlocked).toBe(true);
    expect(get(c, 'journal_50').current).toBe(10);
    // all on one day → mood tracker 1/7
    expect(distinctJournalDays(journal)).toBe(1);
    expect(get(c, 'mood_tracker').unlocked).toBe(false);
  });

  it('Mood tracker needs entries on 7 distinct days', () => {
    const journal = Array.from({ length: 7 }, (_, i) => entry(`j${i}`, i * 2));
    expect(get(ctx({ journal }), 'mood_tracker').unlocked).toBe(true);
  });

  it('counts only completed SOS sessions', () => {
    const sosSessions = [session('1', 'wait_it_out', false), session('2', 'grounding_54321')];
    const c = ctx({ sosSessions });
    expect(get(c, 'sos_1').unlocked).toBe(true);
    expect(get(c, 'wave_rider').unlocked).toBe(false);
    expect(get(ctx({ sosSessions: [session('3', 'wait_it_out')] }), 'wave_rider').unlocked).toBe(true);
  });

  it('Calm breather counts both breathing exercises', () => {
    const sosSessions = [
      session('1', 'breathing_478'),
      session('2', 'box_breathing'),
      session('3', 'breathing_478'),
      session('4', 'box_breathing'),
      session('5', 'body_scan'),
    ];
    const r = get(ctx({ sosSessions }), 'calm_breather');
    expect(r.unlocked).toBe(false);
    expect(r.current).toBe(4);
    expect(get(ctx({ sosSessions: [...sosSessions, session('6', 'breathing_478')] }), 'calm_breather').unlocked).toBe(true);
  });

  it('Craving crusher needs 10 completed sessions', () => {
    const sosSessions = Array.from({ length: 10 }, (_, i) => session(`s${i}`, 'cold_water'));
    expect(get(ctx({ sosSessions }), 'sos_10').unlocked).toBe(true);
  });
});

describe('helpers', () => {
  it('newlyUnlockedIds skips ids already recorded', () => {
    const results = evaluateAll(ctx({ habits: [habit('a', 3.5)] }));
    expect(newlyUnlockedIds(results, {})).toEqual(['first_step', 'streak_1', 'streak_3']);
    expect(newlyUnlockedIds(results, { first_step: 1, streak_1: 2 })).toEqual(['streak_3']);
  });

  it('isUnlocked keeps recorded achievements unlocked after a relapse', () => {
    const results = evaluateAll(ctx({ habits: [habit('a', 0)] }));
    const r = results.find((x) => x.def.id === 'streak_7')!;
    expect(r.unlocked).toBe(false);
    expect(isUnlocked(r, { streak_7: NOW - 5 * DAY })).toBe(true);
  });

  it('nextClosest picks the highest-progress locked achievement', () => {
    const results = evaluateAll(ctx({ habits: [habit('a', 6.5)] }));
    const next = nextClosest(results, {});
    expect(next?.def.id).toBe('streak_7');
    // once recorded it moves on
    expect(nextClosest(results, { streak_7: NOW })?.def.id).not.toBe('streak_7');
  });

  it('nextClosest returns null when everything is unlocked', () => {
    const results = evaluateAll(ctx());
    const all = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, NOW]));
    expect(nextClosest(results, all)).toBeNull();
  });

  it('mostImpressive prefers higher tiers', () => {
    expect(mostImpressive(['streak_1', 'streak_365', 'streak_7'])?.id).toBe('streak_365');
    expect(mostImpressive(['first_step', 'streak_1', 'streak_3'])?.id).toBe('streak_3');
    expect(mostImpressive(['nope'])).toBeUndefined();
    expect(achievementById('phoenix')?.title).toBe('Phoenix');
  });

  it('progress is smooth with elapsed time', () => {
    const a = get(ctx({ habits: [habit('a', 6, { startedAt: NOW - 6 * DAY - 12 * HOUR })] }), 'streak_7');
    expect(a.progress).toBeCloseTo(6.5 / 7, 5);
  });
});
