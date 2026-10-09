import type { Habit, JournalEntry, Relapse, SosSession } from '@/types';
import { DAY, HOUR, addDays, startOfWeek } from '../time';
import {
  cleanIntervals,
  closingLine,
  earliestWeekStart,
  formatWeekRange,
  joinNames,
  overlapMs,
  shiftWeek,
  topMilestonePerHabit,
  trackingStart,
  weekRelativeLabel,
  weekdayLetters,
  weeklySummary,
  type WeeklyInput,
} from '../weekly';

// Thursday 8 Oct 2026, 15:00 local. Week (Mon start) = Mon 5 Oct → Sun 11 Oct.
const NOW = new Date(2026, 9, 8, 15, 0, 0).getTime();
const WEEK = startOfWeek(NOW, 1);
const at = (dayOffset: number, hour = 12) => {
  const d = new Date(addDays(WEEK, dayOffset));
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

function habit(id: string, startedAt: number, extra: Partial<Habit> = {}): Habit {
  return {
    id,
    kind: 'smoking',
    name: id[0].toUpperCase() + id.slice(1),
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

function relapse(habitId: string, when: number, streakMs: number): Relapse {
  return { id: `${habitId}-${when}`, habitId, at: when, streakMs, triggers: [], mood: null, note: '' };
}

function sos(id: string, when: number, completed = true): SosSession {
  return { id, at: when, exerciseId: 'breathing_478', durationSec: 60, completed, habitId: null, intensityBefore: null, intensityAfter: null };
}

function journal(id: string, when: number, mood: JournalEntry['mood']): JournalEntry {
  return { id, createdAt: when, updatedAt: when, title: id, body: '', mood, habitId: null };
}

function input(partial: Partial<WeeklyInput>): WeeklyInput {
  return { habits: [], relapses: [], journal: [], sosSessions: [], ...partial };
}

describe('weekly helpers', () => {
  it('formats week ranges', () => {
    expect(formatWeekRange(new Date(2026, 9, 5).getTime())).toBe('5–11 Oct');
    expect(formatWeekRange(new Date(2026, 8, 28).getTime())).toBe('28 Sep – 4 Oct');
    expect(formatWeekRange(new Date(2025, 11, 29).getTime())).toBe('29 Dec 2025 – 4 Jan 2026');
  });

  it('labels weeks relative to now', () => {
    expect(weekRelativeLabel(WEEK, NOW, 1)).toBe('This week');
    expect(weekRelativeLabel(shiftWeek(WEEK, -1), NOW, 1)).toBe('Last week');
    expect(weekRelativeLabel(shiftWeek(WEEK, -3), NOW, 1)).toBe('3 weeks ago');
    expect(weekRelativeLabel(shiftWeek(WEEK, 1), NOW, 1)).toBe('Next week');
  });

  it('orders weekday letters by week start', () => {
    expect(weekdayLetters(1)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(weekdayLetters(0)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });

  it('builds clean intervals and overlaps', () => {
    const h = habit('a', at(2));
    const rs = [relapse('a', at(2), 3 * DAY)];
    const iv = cleanIntervals(h, rs, NOW);
    expect(iv).toEqual([
      [at(2) - 3 * DAY, at(2)],
      [at(2), NOW],
    ]);
    expect(overlapMs(iv, WEEK, NOW)).toBe(NOW - WEEK);
    expect(trackingStart(h, rs)).toBe(at(2) - 3 * DAY);
  });

  it('finds the earliest week with data', () => {
    const h = habit('a', at(-10), { firstStartedAt: at(-10) });
    expect(earliestWeekStart({ habits: [h], relapses: [] }, 1, NOW)).toBe(shiftWeek(WEEK, -2));
    expect(earliestWeekStart({ habits: [], relapses: [] }, 1, NOW)).toBe(WEEK);
  });
});

describe('weeklySummary', () => {
  it('marks clean, relapse, not-started and future days', () => {
    const smoking = habit('smoking', at(2, 18), { firstStartedAt: at(-30) });
    const coffee = habit('coffee', at(1, 9), { order: 1 });
    const s = weeklySummary(
      input({ habits: [smoking, coffee], relapses: [relapse('smoking', at(2, 18), at(2, 18) - at(-30))] }),
      WEEK,
      NOW,
    );
    expect(s.isCurrentWeek).toBe(true);
    expect(s.isComplete).toBe(false);
    expect(s.elapsedDays).toBe(4);
    const [sm, co] = s.habits;
    expect(sm.days).toEqual(['clean', 'clean', 'relapse', 'clean', 'future', 'future', 'future']);
    expect(sm.cleanDays).toBe(3);
    expect(sm.relapses).toBe(1);
    expect(co.days).toEqual(['not_started', 'clean', 'clean', 'clean', 'future', 'future', 'future']);
    expect(s.cleanDays).toBe(6);
    expect(s.trackedDays).toBe(7);
    expect(s.relapses).toBe(1);
  });

  it('measures money and time saved only inside the week', () => {
    const h = habit('alcohol', at(-20), { dailyCost: 10, currency: 'EUR', dailyMinutes: 60 });
    const past = shiftWeek(WEEK, -1);
    const s = weeklySummary(input({ habits: [h] }), past, NOW);
    expect(s.isComplete).toBe(true);
    expect(s.moneyByCurrency.EUR).toBeCloseTo(70, 5);
    expect(s.minutesSaved).toBeCloseTo(7 * 60, 5);
    expect(s.habits[0].days.every((d) => d === 'clean')).toBe(true);
    expect(s.highlights).toContain('Clean all 7 days from Alcohol 🎉');
    expect(s.highlights).toContain('You kept €70 in your pocket');
    expect(s.highlights).toContain('You won back 7h of your time');
    expect(s.closingLine).toBe(closingLine(s));
    expect(s.closingLine).toMatch(/perfect week/i);
  });

  it('the current week only counts time up to now', () => {
    const h = habit('alcohol', at(-20), { dailyCost: 24, currency: 'USD' });
    const s = weeklySummary(input({ habits: [h] }), WEEK, NOW);
    expect(s.moneyByCurrency.USD).toBeCloseTo((24 * (NOW - WEEK)) / DAY, 5);
    expect(s.highlights).toContain('Clean every day so far from Alcohol 💪');
  });

  it('keeps per-currency totals separate', () => {
    const s = weeklySummary(
      input({
        habits: [habit('a', at(-20), { dailyCost: 1, currency: 'USD' }), habit('b', at(-20), { dailyCost: 2, currency: 'UAH', order: 1 })],
      }),
      shiftWeek(WEEK, -1),
      NOW,
    );
    expect(Object.keys(s.moneyByCurrency).sort()).toEqual(['UAH', 'USD']);
    expect(s.moneyByCurrency.UAH).toBeCloseTo(14, 5);
  });

  it('counts SOS sessions, journal entries and average mood in the week', () => {
    const s = weeklySummary(
      input({
        habits: [habit('a', at(-3))],
        sosSessions: [sos('1', at(0)), sos('2', at(1)), sos('3', at(2), false), sos('old', at(-2))],
        journal: [journal('1', at(0), 'star'), journal('2', at(3), 'sparkle'), journal('old', at(-1), 'stormy')],
      }),
      WEEK,
      NOW,
    );
    expect(s.sos).toEqual({ count: 3, completed: 2 });
    expect(s.journal.count).toBe(2);
    expect(s.journal.avgMood).toBeCloseTo(4.5, 5);
    expect(s.highlights).toContain('You resisted 2 cravings with SOS');
    expect(s.highlights).toContain('You wrote 2 journal entries');
    expect(s.highlights).toContain('Your mood was bright this week ☀️');
  });

  it('reports milestones crossed during the week and the best streak', () => {
    // 30-day milestone crossed on Tuesday of this week
    const h = habit('alcohol', at(1, 10) - 30 * DAY);
    const s = weeklySummary(input({ habits: [h, habit('b', at(3, 8), { order: 1 })] }), WEEK, NOW);
    expect(s.milestones.map((m) => m.days)).toEqual([30]);
    expect(s.highlights[0]).toBe('Reached 1 month free from Alcohol 🏆');
    expect(s.bestStreakHabit?.id).toBe('alcohol');
    expect(s.bestStreakDays).toBe(32);
  });

  it('lists only the biggest milestone per habit, never the same line twice', () => {
    // Two relapses this week (Mon 08:00, Wed 12:00): the 1-day milestone is crossed twice,
    // and the streak before Monday's relapse crossed 3 days on Sunday of the previous week.
    const start = at(-4, 8);
    const rs = [relapse('smoking', at(0, 8), at(0, 8) - start), relapse('smoking', at(2, 12), at(2, 12) - at(0, 8))];
    const h = habit('smoking', at(2, 12), { firstStartedAt: start });
    const s = weeklySummary(input({ habits: [h], relapses: rs }), WEEK, NOW + 23 * HOUR);
    expect(s.milestones.filter((m) => m.days === 1).length).toBe(2);
    const reached = s.highlights.filter((t) => t.startsWith('Reached'));
    expect(reached).toEqual(['Reached 1 day free from Smoking 🏆']);
    expect(new Set(s.highlights).size).toBe(s.highlights.length);
  });

  it('topMilestonePerHabit keeps the biggest, most recent milestone of each habit', () => {
    const a = habit('a', 0);
    const b = habit('b', 0);
    const list = [
      { habit: a, days: 3, at: 30 },
      { habit: b, days: 3, at: 20 },
      { habit: a, days: 1, at: 50 },
      { habit: b, days: 1, at: 10 },
      { habit: b, days: 1, at: 40 },
    ];
    expect(topMilestonePerHabit(list).map((m) => [m.habit.id, m.days, m.at])).toEqual([
      ['a', 3, 30],
      ['b', 3, 20],
    ]);
    expect(topMilestonePerHabit(list.slice(3)).map((m) => m.at)).toEqual([40]);
  });

  it('measures the best streak at the end of a past week', () => {
    const h = habit('a', at(-40));
    const s = weeklySummary(input({ habits: [h] }), shiftWeek(WEEK, -1), NOW);
    // end of last week = WEEK; streak there = 40 days minus 12h (started at noon)
    expect(s.bestStreakDays).toBe(39);
  });

  it('skips archived habits and habits that start after the week', () => {
    const s = weeklySummary(
      input({ habits: [habit('arch', at(-20), { archived: true }), habit('later', at(10))] }),
      WEEK,
      NOW,
    );
    expect(s.habits).toHaveLength(0);
    expect(s.trackedDays).toBe(0);
    expect(s.highlights).toEqual([]);
    expect(s.closingLine).toMatch(/single day/);
  });

  it('a habit started mid-week gets the since-you-started highlight', () => {
    const s = weeklySummary(input({ habits: [habit('vape', at(2, 9))] }), WEEK, NOW + 5 * DAY);
    expect(s.isComplete).toBe(true);
    expect(s.habits[0].days.slice(0, 2)).toEqual(['not_started', 'not_started']);
    expect(s.highlights).toContain('No slips with Vape since you started 🌱');
  });

  it('groups clean-habit highlights instead of repeating them', () => {
    const habits = [habit('smoking', at(-20)), habit('alcohol', at(-20), { order: 1 }), habit('coffee', at(-20), { order: 2 })];
    const past = weeklySummary(input({ habits: habits.slice(0, 2) }), shiftWeek(WEEK, -1), NOW);
    expect(past.highlights).toContain('Clean all 7 days from Smoking & Alcohol 🎉');
    const now = weeklySummary(input({ habits }), WEEK, NOW);
    expect(now.highlights).toContain('Clean every day so far from 3 habits 💪');
    expect(now.highlights.filter((h) => h.startsWith('Clean')).length).toBe(1);
    expect(joinNames([])).toBe('');
  });

  it('a week with a relapse closes with an encouraging line', () => {
    const s = weeklySummary(
      input({ habits: [habit('a', at(1))], relapses: [relapse('a', at(1), 5 * DAY)] }),
      WEEK,
      NOW,
    );
    expect(s.relapses).toBe(1);
    expect(s.closingLine).toMatch(/fresh start/);
  });

  it('handles a Sunday-start week', () => {
    const sun = startOfWeek(NOW, 0);
    const s = weeklySummary(input({ habits: [habit('a', at(-20))] }), sun, NOW);
    expect(new Date(s.dayStarts[0]).getDay()).toBe(0);
    expect(s.elapsedDays).toBe(5);
    expect(s.weekEnd - s.weekStart).toBeGreaterThanOrEqual(7 * DAY - HOUR);
  });
});
