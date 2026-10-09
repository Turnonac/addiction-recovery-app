import type { Habit, JournalEntry, MoodId, Relapse, TriggerId } from '@/types';
import { snapshot } from '../habitStats';
import {
  averageStreakMs,
  cleanMsUntil,
  combinedStreakHistory,
  compareRows,
  cumulativeSavingsSeries,
  dailySavingsRate,
  dailyStatusGrid,
  habitStartAt,
  moodContrast,
  moodDistribution,
  moodInsight,
  moodScore,
  moodTimeline,
  peakHour,
  rankedTriggers,
  recentWithRecord,
  relapseHourHistogram,
  sortCurrencyTotals,
  streakHistory,
  triggerBreakdown,
} from '../stats';
import { DAY, HOUR, addDays, startOfDay, startOfWeek } from '../time';

// Local noon so day bucketing is stable regardless of the test machine's time zone.
const now = new Date(2026, 9, 9, 12, 0, 0).getTime();

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  kind: 'smoking',
  name: 'Smoking',
  color: '#EF4444',
  icon: 'smoking',
  startedAt: now - 10 * DAY,
  firstStartedAt: now - 40 * DAY,
  createdAt: now - 40 * DAY,
  dailyCost: 10,
  currency: 'USD',
  dailyMinutes: 60,
  goalDays: null,
  reason: '',
  archived: false,
  order: 0,
  ...over,
});

let rid = 0;
const relapse = (at: number, streakDays: number, over: Partial<Relapse> = {}): Relapse => ({
  id: `r${rid++}`,
  habitId: 'h1',
  at,
  streakMs: streakDays * DAY,
  triggers: [],
  mood: null,
  note: '',
  ...over,
});

const entry = (createdAt: number, mood: MoodId, over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `j${createdAt}`,
  createdAt,
  updatedAt: createdAt,
  title: 't',
  body: 'b',
  mood,
  habitId: null,
  ...over,
});

// h1: first start 40d ago, relapsed 30d ago (10d streak) and 10d ago (20d streak), current 10d.
const h1Relapses = () => [relapse(now - 30 * DAY, 10), relapse(now - 10 * DAY, 20)];

describe('streakHistory', () => {
  it('lists ended streaks then the current one', () => {
    const list = streakHistory(habit(), h1Relapses(), now);
    expect(list.map((e) => e.ms / DAY)).toEqual([10, 20, 10]);
    expect(list.map((e) => e.attempt)).toEqual([1, 2, 3]);
    expect(list.map((e) => e.current)).toEqual([false, false, true]);
    expect(list[0].startAt).toBe(now - 40 * DAY);
    expect(list[2].endAt).toBe(now);
  });

  it('marks exactly one record, preferring the latest on ties', () => {
    const list = streakHistory(habit({ startedAt: now - 20 * DAY }), [relapse(now - 20 * DAY, 20)], now);
    expect(list.map((e) => e.isRecord)).toEqual([false, true]);
    const single = streakHistory(habit(), h1Relapses(), now);
    expect(single.filter((e) => e.isRecord)).toHaveLength(1);
    expect(single[1].isRecord).toBe(true);
  });

  it('handles a brand new habit and ignores other habits', () => {
    const list = streakHistory(habit({ startedAt: now }), [relapse(now - DAY, 3, { habitId: 'other' })], now);
    expect(list).toHaveLength(1);
    expect(list[0].ms).toBe(0);
    expect(list[0].isRecord).toBe(false);
  });

  it('clamps a future start to zero', () => {
    const list = streakHistory(habit({ startedAt: now + DAY }), [], now);
    expect(list[0].ms).toBe(0);
  });

  it('sorts relapses chronologically even when stored out of order', () => {
    const list = streakHistory(habit(), [...h1Relapses()].reverse(), now);
    expect(list.map((e) => e.ms / DAY)).toEqual([10, 20, 10]);
  });
});

describe('combinedStreakHistory', () => {
  const h2 = habit({ id: 'h2', name: 'Alcohol', startedAt: now - 35 * DAY, firstStartedAt: now - 35 * DAY });

  it('merges habits by end time (ongoing last) with one overall record', () => {
    const list = combinedStreakHistory([habit(), h2], h1Relapses(), now);
    expect(list.map((e) => `${e.habitId}:${e.attempt}`)).toEqual(['h1:1', 'h1:2', 'h2:1', 'h1:3']);
    expect(list.filter((e) => e.isRecord).map((e) => e.habitId)).toEqual(['h2']);
  });

  it('keeps the most recent entries and every ongoing streak when limited', () => {
    const list = combinedStreakHistory([habit(), h2], h1Relapses(), now, 2);
    expect(list).toHaveLength(2);
    expect(list.every((e) => e.current)).toBe(true);
    expect(list.filter((e) => e.isRecord)).toHaveLength(1);
  });

  it('keeps an older all-time record in the window instead of promoting a lesser streak', () => {
    const old = habit({ id: 'h3', startedAt: now - 2 * DAY, firstStartedAt: now - 102 * DAY });
    const rs = [relapse(now - 2 * DAY, 100, { habitId: 'h3' })];
    const list = combinedStreakHistory([old, habit({ id: 'h4', startedAt: now - 5 * DAY })], rs, now, 2);
    // record (100d, ended 2 days ago) first, then the most recent entry
    expect(list.map((e) => e.ms / DAY)).toEqual([100, 2]);
    expect(list.filter((e) => e.isRecord).map((e) => e.ms / DAY)).toEqual([100]);
  });
});

describe('recentWithRecord', () => {
  // 25 attempts of one habit; attempt 3 (index 2) is the longest
  const many = () => {
    const rs = Array.from({ length: 24 }, (_, i) => relapse(now - (24 - i) * DAY, i === 2 ? 50 : 1));
    return streakHistory(habit({ startedAt: now - 12 * 60 * 60 * 1000 }), rs, now);
  };

  it('returns short lists untouched', () => {
    const list = streakHistory(habit(), h1Relapses(), now);
    expect(recentWithRecord(list, 20)).toEqual(list);
  });

  it('takes the record plus the last limit - 1 entries in time order', () => {
    const list = many();
    expect(list[2].isRecord).toBe(true);
    const win = recentWithRecord(list, 20);
    expect(win).toHaveLength(20);
    expect(win[0].attempt).toBe(3);
    expect(win.slice(1).map((e) => e.attempt)).toEqual(Array.from({ length: 19 }, (_, i) => 7 + i));
    expect(win.filter((e) => e.isRecord)).toHaveLength(1);
  });

  it('is a plain tail when the record is already recent', () => {
    const rs = Array.from({ length: 24 }, (_, i) => relapse(now - (24 - i) * DAY, 1));
    const list = streakHistory(habit({ startedAt: now - 30 * DAY }), rs, now);
    const win = recentWithRecord(list, 5);
    expect(win.map((e) => e.attempt)).toEqual([21, 22, 23, 24, 25]);
    expect(win[4].isRecord).toBe(true);
  });
});

describe('averageStreakMs', () => {
  it('averages all streaks, 0 when empty', () => {
    expect(averageStreakMs([])).toBe(0);
    const list = streakHistory(habit(), h1Relapses(), now);
    expect(averageStreakMs(list)).toBeCloseTo((40 / 3) * DAY);
  });
});

describe('habitStartAt / cleanMsUntil', () => {
  it('uses the earliest known start', () => {
    expect(habitStartAt(habit(), h1Relapses())).toBe(now - 40 * DAY);
    // firstStartedAt after startedAt (data glitch) → startedAt wins
    expect(habitStartAt(habit({ firstStartedAt: now, startedAt: now - 5 * DAY }), [])).toBe(now - 5 * DAY);
    // a relapse whose streak began before firstStartedAt
    expect(habitStartAt(habit({ firstStartedAt: now - 20 * DAY }), [relapse(now - 15 * DAY, 10)])).toBe(now - 25 * DAY);
  });

  it('sums clean time up to an instant', () => {
    const list = streakHistory(habit(), h1Relapses(), now);
    expect(cleanMsUntil(list, now - 50 * DAY)).toBe(0);
    expect(cleanMsUntil(list, now - 35 * DAY)).toBe(5 * DAY);
    expect(cleanMsUntil(list, now - 10 * DAY)).toBe(30 * DAY);
    expect(cleanMsUntil(list, now)).toBe(40 * DAY);
  });
});

describe('cumulativeSavingsSeries', () => {
  it('returns [] when nothing is tracked', () => {
    expect(cumulativeSavingsSeries([], [], now)).toEqual([]);
    expect(cumulativeSavingsSeries([habit({ dailyCost: 0, dailyMinutes: 0 })], [], now)).toEqual([]);
  });

  it('samples evenly from the first start to now and ends at the snapshot totals', () => {
    const rs = h1Relapses();
    const series = cumulativeSavingsSeries([habit()], rs, now, 5);
    expect(series).toHaveLength(5);
    expect(series[0].t).toBe(now - 40 * DAY);
    expect(series[4].t).toBe(now);
    expect(series[0].money.USD).toBe(0);
    expect(series[2].t).toBe(now - 20 * DAY);
    expect(series[2].money.USD).toBeCloseTo(200);
    const snap = snapshot(habit(), rs, now);
    expect(series[4].money.USD).toBeCloseTo(snap.moneySaved);
    expect(series[4].minutes).toBeCloseTo(snap.minutesSaved);
  });

  it('never decreases and keeps currencies separate', () => {
    const habits = [
      habit(),
      habit({ id: 'h2', currency: 'EUR', dailyCost: 5, dailyMinutes: 0, startedAt: now - 3 * DAY, firstStartedAt: now - 3 * DAY }),
      habit({ id: 'h3', dailyCost: 0, dailyMinutes: 30, startedAt: now - 2 * DAY, firstStartedAt: now - 2 * DAY }),
    ];
    const series = cumulativeSavingsSeries(habits, h1Relapses(), now, 30);
    expect(Object.keys(series[0].money).sort()).toEqual(['EUR', 'USD']);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].money.USD).toBeGreaterThanOrEqual(series[i - 1].money.USD);
      expect(series[i].minutes).toBeGreaterThanOrEqual(series[i - 1].minutes);
    }
    const last = series[series.length - 1];
    expect(last.money.EUR).toBeCloseTo(15);
    expect(last.minutes).toBeCloseTo(40 * 60 + 2 * 30);
  });

  it('copes with a habit that starts now', () => {
    const series = cumulativeSavingsSeries([habit({ startedAt: now, firstStartedAt: now })], [], now, 4);
    expect(series).toHaveLength(4);
    expect(series.every((p) => p.money.USD === 0 && p.t === now)).toBe(true);
  });
});

describe('sortCurrencyTotals / dailySavingsRate', () => {
  it('sorts by amount', () => {
    expect(sortCurrencyTotals({ USD: 127, UAH: 4600, EUR: 2000 }).map((c) => c.currency)).toEqual(['UAH', 'EUR', 'USD']);
    expect(sortCurrencyTotals({})).toEqual([]);
  });

  it('sums daily rates per currency', () => {
    const rate = dailySavingsRate([habit(), habit({ id: 'b', dailyCost: 5 }), habit({ id: 'c', currency: 'EUR', dailyCost: 0, dailyMinutes: 15 })]);
    expect(rate.money).toEqual({ USD: 15 });
    expect(rate.minutes).toBe(135);
  });
});

describe('dailyStatusGrid', () => {
  it('builds weeks × 7 ending with the current week', () => {
    const grid = dailyStatusGrid([habit()], h1Relapses(), now, 12, 1);
    expect(grid).toHaveLength(12);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    const last = grid[11];
    expect(last[0].date).toBe(startOfWeek(now, 1));
    expect(grid[0][0].date).toBe(addDays(startOfWeek(now, 1), -77));
    const today = grid.flat().find((c) => c.isToday)!;
    expect(today.date).toBe(startOfDay(now));
    expect(today.status).toBe('clean');
    expect(grid.flat().filter((c) => c.isToday)).toHaveLength(1);
  });

  it('marks relapse, clean, untracked and future days', () => {
    const grid = dailyStatusGrid([habit()], h1Relapses(), now, 12, 0).flat();
    const at = (ts: number) => grid.find((c) => c.date === startOfDay(ts))!;
    expect(at(now - 30 * DAY).status).toBe('relapse');
    expect(at(now - 30 * DAY).relapses).toBe(1);
    expect(at(now - 10 * DAY).status).toBe('relapse');
    expect(at(now - 11 * DAY).status).toBe('clean');
    expect(at(now - 60 * DAY).status).toBe('untracked');
    expect(at(now - 60 * DAY).tracked).toBe(0);
    const future = grid.filter((c) => c.date > now);
    expect(future.every((c) => c.status === 'future')).toBe(true);
    expect(grid[0].date).toBe(addDays(startOfWeek(now, 0), -77));
  });

  it('counts clean habits per day across habits', () => {
    const h2 = habit({ id: 'h2', startedAt: now - 5 * DAY, firstStartedAt: now - 5 * DAY });
    const grid = dailyStatusGrid([habit(), h2], h1Relapses(), now, 4).flat();
    const at = (ts: number) => grid.find((c) => c.date === startOfDay(ts))!;
    expect(at(now - 2 * DAY)).toMatchObject({ tracked: 2, clean: 2, relapses: 0, status: 'clean' });
    expect(at(now - 8 * DAY)).toMatchObject({ tracked: 1, clean: 1 });
    expect(at(now - 10 * DAY)).toMatchObject({ tracked: 1, clean: 0, relapses: 1, status: 'relapse' });
  });

  it('leaves days untracked between a relapse and a start date edited forward', () => {
    // relapse 5 days ago ended a 10 day streak; the new start was then edited to yesterday
    const h = habit({ startedAt: now - DAY, firstStartedAt: now - 15 * DAY });
    const grid = dailyStatusGrid([h], [relapse(now - 5 * DAY, 10)], now, 4).flat();
    const at = (ts: number) => grid.find((c) => c.date === startOfDay(ts))!;
    expect(at(now - 6 * DAY).status).toBe('clean');
    expect(at(now - 5 * DAY).status).toBe('relapse');
    for (const d of [2, 3, 4]) expect(at(now - d * DAY)).toMatchObject({ status: 'untracked', tracked: 0 });
    expect(at(now - DAY).status).toBe('clean');
    expect(at(now).status).toBe('clean');
  });

  it('ignores relapses of habits outside the list', () => {
    const grid = dailyStatusGrid([habit()], [relapse(now - 2 * DAY, 1, { habitId: 'x' })], now, 2).flat();
    expect(grid.find((c) => c.date === startOfDay(now - 2 * DAY))!.status).toBe('clean');
  });
});

describe('triggerBreakdown', () => {
  const t = (at: number, triggers: TriggerId[], habitId = 'h1') => relapse(at, 1, { triggers, habitId });
  const habits = [habit(), habit({ id: 'h2', name: 'Alcohol' })];

  it('counts triggers per relapse with share and relative size', () => {
    const rs = [t(1, ['stress', 'social']), t(2, ['stress']), t(3, ['social'], 'h2'), t(4, ['habit_loop']), t(5, ['stress', 'stress'])];
    const b = triggerBreakdown(rs, habits);
    expect(b.relapseCount).toBe(5);
    expect(b.items).toHaveLength(9);
    expect(b.items[0].trigger).toBe('stress');
    const stress = b.items.find((i) => i.trigger === 'stress')!;
    expect(stress.count).toBe(3);
    expect(stress.share).toBeCloseTo(0.6);
    expect(stress.relative).toBe(1);
    const social = b.items.find((i) => i.trigger === 'social')!;
    expect(social.relative).toBeCloseTo(2 / 3);
    expect(social.habitNames).toEqual(['Smoking', 'Alcohol']);
    expect(b.items.find((i) => i.trigger === 'boredom')!.count).toBe(0);
  });

  it('counts untagged relapses and filters by habit', () => {
    const b = triggerBreakdown([t(1, []), t(2, ['fatigue'], 'gone')], habits);
    expect(b.relapseCount).toBe(1);
    expect(b.untagged).toBe(1);
    expect(b.items.every((i) => i.count === 0 && i.relative === 0 && i.share === 0)).toBe(true);
  });

  it('ranks triggers by count then radar order', () => {
    const b = triggerBreakdown([t(1, ['social', 'stress']), t(2, ['habit_loop']), t(3, ['social', 'stress'])], habits);
    expect(rankedTriggers(b.items).map((i) => i.trigger)).toEqual(['stress', 'social', 'habit_loop']);
  });
});

describe('mood', () => {
  it('distributes journal and relapse moods in MOODS order', () => {
    const d = moodDistribution(
      [entry(now, 'sunny'), entry(now - DAY, 'sunny'), entry(now, 'star')],
      [relapse(now, 1, { mood: 'stormy' }), relapse(now, 1, { mood: null })],
    );
    expect(d.map((m) => m.mood)).toEqual(['stormy', 'cloudy', 'sunny', 'sparkle', 'star']);
    expect(d[0]).toMatchObject({ count: 1, journal: 0, relapses: 1 });
    expect(d[2]).toMatchObject({ count: 2, journal: 2, relapses: 0 });
    expect(d[2].share).toBeCloseTo(0.5);
    expect(moodDistribution([], []).every((m) => m.share === 0)).toBe(true);
  });

  it('scores moods 1..5', () => {
    expect(moodScore('stormy')).toBe(1);
    expect(moodScore('star')).toBe(5);
  });

  it('averages journal mood per day for the last N days', () => {
    const tl = moodTimeline(
      [entry(now, 'star'), entry(now - HOUR, 'sunny'), entry(now - 3 * DAY, 'cloudy'), entry(now - 40 * DAY, 'stormy')],
      now,
      30,
    );
    expect(tl).toHaveLength(30);
    expect(tl[29].date).toBe(startOfDay(now));
    expect(tl[29]).toMatchObject({ average: 4, count: 2 });
    expect(tl[26]).toMatchObject({ average: 2, count: 1 });
    expect(tl[0].average).toBeNull();
    expect(tl.reduce((a, d) => a + d.count, 0)).toBe(3);
  });

  it('contrasts relapse days with clean days', () => {
    const journal = [entry(now - 30 * DAY, 'stormy'), entry(now - DAY, 'sparkle'), entry(now - 2 * DAY, 'star')];
    const c = moodContrast(journal, [relapse(now - 30 * DAY + HOUR, 3)]);
    expect(c.relapseDays).toBe(1);
    expect(c.cleanDays).toBe(4.5);
    expect(c.relapseEntries).toBe(1);
    expect(c.cleanEntries).toBe(2);
  });

  it('writes an insight', () => {
    expect(moodInsight([], [])).toBeNull();
    const rd = now - 30 * DAY;
    const rs = [relapse(rd, 1)];
    const pair = (onRelapse: MoodId, onClean: MoodId) => [entry(rd, onRelapse), entry(rd + HOUR, onRelapse), entry(now, onClean), entry(now - DAY, onClean)];
    const higher = moodInsight(pair('stormy', 'star'), rs);
    expect(higher?.icon).toBe('trending-up');
    expect(higher?.text).toContain('4.0 points higher');
    expect(moodInsight(pair('sunny', 'sunny'), rs)?.icon).toBe('equal');
    expect(moodInsight(pair('star', 'stormy'), rs)?.icon).toBe('trending-down');
    expect(moodInsight([entry(now, 'sparkle')], [])?.text).toContain('"good"');
    expect(moodInsight([entry(now, 'sparkle')], [relapse(now, 1)])?.icon).toBe('notebook-outline');
  });

  it('makes no numeric claim from too few entries', () => {
    const rd = now - 30 * DAY;
    const one = moodInsight([entry(rd, 'stormy'), entry(now, 'star')], [relapse(rd, 1)]);
    expect(one?.icon).toBe('notebook-outline');
    expect(one?.text).not.toMatch(/\d/);
    expect(one?.text).toContain('Keep journaling');
    // plenty of clean-day entries but a single relapse-day entry is still not enough
    const lopsided = moodInsight([entry(rd, 'stormy'), entry(now, 'star'), entry(now - DAY, 'star'), entry(now - 2 * DAY, 'star')], [relapse(rd, 1)]);
    expect(lopsided?.icon).toBe('notebook-outline');
    // overall average (1 + 5 + 5 + 5) / 4 = 4
    expect(lopsided?.text).toContain('"good"');
  });

  it('bins relapses by local hour and finds the peak', () => {
    const at = (h: number) => new Date(2026, 9, 1, h, 30).getTime();
    const hist = relapseHourHistogram([relapse(at(18), 1), relapse(at(18), 1), relapse(at(7), 1)]);
    expect(hist).toHaveLength(24);
    expect(hist[18]).toBe(2);
    expect(hist[7]).toBe(1);
    expect(peakHour(hist)).toBe(18);
    expect(peakHour(relapseHourHistogram([]))).toBe(-1);
  });
});

describe('compareRows', () => {
  it('computes day-based success rate, attempts and savings', () => {
    const rs = h1Relapses();
    const rows = compareRows(
      [snapshot(habit(), rs, now), snapshot(habit({ id: 'h2', name: 'Coffee', dailyCost: 0, startedAt: now, firstStartedAt: now }), [], now)],
      now,
    );
    expect(rows[0]).toMatchObject({ habitId: 'h1', attempts: 3, streakDays: 10, recordDays: 20, tracksMoney: true, currency: 'USD' });
    // 41 calendar days (40 days ago … today), 2 of them with a relapse
    expect(rows[0].trackedDays).toBe(41);
    expect(rows[0].relapseDays).toBe(2);
    expect(rows[0].successRate).toBeCloseTo(39 / 41);
    expect(rows[0].moneySaved).toBeCloseTo(400);
    // just started → nothing to fail yet
    expect(rows[1]).toMatchObject({ trackedDays: 1, relapseDays: 0, successRate: 1, tracksMoney: false });
  });

  it('counts relapse days, not relapses', () => {
    const h = habit({ startedAt: now - 5 * DAY + HOUR, firstStartedAt: now - 9 * DAY });
    const rs = [relapse(now - 5 * DAY, 4), relapse(now - 5 * DAY + HOUR, 0)];
    const rows = compareRows([snapshot(h, rs, now)], now);
    expect(rows[0].relapseDays).toBe(1);
    expect(rows[0].successRate).toBeCloseTo(9 / 10);
  });

  it('never goes below zero when every day had a relapse', () => {
    const h = habit({ startedAt: now - HOUR, firstStartedAt: now - 2 * HOUR });
    const rows = compareRows([snapshot(h, [relapse(now - HOUR, 0)], now)], now);
    expect(rows[0].successRate).toBe(0);
  });
});
