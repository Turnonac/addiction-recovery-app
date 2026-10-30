import { describe, expect, it, test } from '@jest/globals';

import { bestStreak, counterStart, currentStreak, redDates, streaksIfRed } from '@/domain/streak';
import type { ColorLevel, DayLog } from '@/domain/types';

const TODAY = '2026-10-29';

const day = (date: string, color: ColorLevel | null, checkedIn = false): DayLog => ({ date, color, checkedIn });
const red = (date: string): DayLog => day(date, 3);

describe('redDates', () => {
  it('returns unique Red dates up to today, ascending', () => {
    const days = [
      red('2026-10-20'),
      day('2026-10-21', 2),
      red('2026-10-05'),
      red('2026-10-20'),
      red(TODAY),
      red('2026-10-30'),
      day('2026-10-10', 0, true),
    ];
    expect(redDates(days, TODAY)).toEqual(['2026-10-05', '2026-10-20', TODAY]);
  });

  it('is empty when there are no Reds', () => {
    expect(redDates([day('2026-10-01', 2), day('2026-10-02', null, true)], TODAY)).toEqual([]);
  });
});

describe('counterStart', () => {
  test.each<[string, DayLog[], string | null, string | null]>([
    ['no installDate -> null', [red('2026-10-01')], null, null],
    ['no Red on or before install -> installDate ("Start counting today")', [], '2026-10-10', '2026-10-10'],
    ['the latest Red on or before install ("My last Red day was…")', [red('2026-09-01'), red('2026-10-05')], '2026-10-10', '2026-10-05'],
    ['a Red on the install day', [red('2026-10-10')], '2026-10-10', '2026-10-10'],
    ['Reds after install do not move it', [red('2026-10-20')], '2026-10-10', '2026-10-10'],
    ['a future installDate is treated as today', [], '2026-11-02', TODAY],
  ])('%s', (_name, days, installDate, expected) => {
    expect(counterStart(days, installDate, TODAY)).toBe(expected);
  });
});

describe('currentStreak', () => {
  test.each<[string, DayLog[], string | null, number | null]>([
    ['no anchor at all -> null', [], null, null],
    ['only non-Red days and no install -> null', [day('2026-10-20', 2), day('2026-10-21', 0)], null, null],
    ['only a future Red and no install -> null', [red('2026-11-05')], null, null],
    ['counts from installDate before any Red', [], '2026-10-01', 28],
    ['install today -> 0', [], TODAY, 0],
    ['Red today -> 0', [red(TODAY)], '2026-10-01', 0],
    ['Red yesterday -> 1', [red('2026-10-28')], null, 1],
    ['consecutive Reds count from the last one', [red('2026-10-25'), red('2026-10-26'), red('2026-10-27')], null, 2],
    ['Red after installDate', [red('2026-10-20')], '2026-10-01', 9],
    ['a last Red day before install counts from that day', [red('2026-09-01')], '2026-10-01', 58],
    ['the latest Red before install wins', [red('2026-08-01'), red('2026-09-01')], '2026-10-01', 58],
    ['future Red is ignored', [red('2026-10-30'), red('2026-12-01')], '2026-10-01', 28],
    [
      'unlogged and non-Red days never reset',
      [day('2026-10-05', 2), day('2026-10-10', 1), day('2026-10-28', null, true)],
      '2026-10-01',
      28,
    ],
    ['future installDate is clamped to 0', [], '2026-11-02', 0],
    ['duplicate Red rows count once', [red('2026-10-19'), red('2026-10-19')], null, 10],
  ])('%s', (_name, days, installDate, expected) => {
    expect(currentStreak(days, installDate, TODAY)).toBe(expected);
  });

  it('counts across DST changes by calendar day', () => {
    expect(currentStreak([red('2026-03-07')], null, '2026-03-09')).toBe(2);
    expect(currentStreak([red('2026-10-31')], null, '2026-11-02')).toBe(2);
  });
});

describe('bestStreak', () => {
  test.each<[string, DayLog[], string | null, number | null]>([
    ['no anchor at all -> null', [], null, null],
    ['only a future Red and no install -> null', [red('2026-11-05')], null, null],
    ['install only = current streak', [], '2026-10-01', 28],
    ['Red today only -> 0', [red(TODAY)], null, 0],
    [
      // anchors: Sep1 (install), Sep11, Sep12, Oct27: runs 9, 0, 44; current 2
      'longest completed run among several',
      [red('2026-09-11'), red('2026-09-12'), red('2026-10-27')],
      '2026-09-01',
      44,
    ],
    [
      // runs: Oct1→Oct3 = 1, Oct3→Oct5 = 1; current 24
      'current run is the longest',
      [red('2026-10-03'), red('2026-10-05')],
      '2026-10-01',
      24,
    ],
    [
      // runs: Oct20→Oct28 = 7, Oct28→Oct29 = 0; current 0
      'keeps a past best after Reds yesterday and today',
      [red('2026-10-28'), red(TODAY)],
      '2026-10-20',
      7,
    ],
    [
      // anchors: Aug1, Sep30 (Reds; install Oct25 is not one, a Red is before it): run 59; current 29
      'Reds before install form runs',
      [red('2026-08-01'), red('2026-09-30')],
      '2026-10-25',
      59,
    ],
    [
      // "Start counting today" on Oct 27, then a Red backfilled on Oct 1: the day log
      // is the one source, so the counter counts from that Red (28), and so does best
      'a Red backfilled before install counts from that Red',
      [red('2026-10-01')],
      '2026-10-27',
      28,
    ],
    ['Reds only, no installDate', [red('2026-10-01'), red('2026-10-20')], null, 18],
    ['future Red is ignored', [red('2026-10-01'), red('2026-11-15')], null, 28],
    ['duplicate Red rows do not create a -1 run', [red('2026-10-10'), red('2026-10-10')], null, 19],
    [
      'unlogged and non-Red days never break a run',
      [day('2026-10-05', 2), red('2026-10-10'), day('2026-10-12', 1)],
      '2026-09-01',
      38,
    ],
  ])('%s', (_name, days, installDate, expected) => {
    expect(bestStreak(days, installDate, TODAY)).toBe(expected);
  });

  it('is never below the current streak', () => {
    const cases: [DayLog[], string | null][] = [
      [[red('2026-10-01'), red('2026-10-02')], null],
      [[red('2026-01-01')], '2026-06-01'],
      [[], '2026-10-29'],
      [[red('2026-10-28')], '2026-10-27'],
    ];
    for (const [days, installDate] of cases) {
      const best = bestStreak(days, installDate, TODAY);
      const current = currentStreak(days, installDate, TODAY);
      expect(best).not.toBeNull();
      expect(best!).toBeGreaterThanOrEqual(current!);
    }
  });
});

describe('streaksIfRed', () => {
  test.each<[string, DayLog[], string | null, string, { current: number; best: number }]>([
    ['Red today restarts the counter', [], '2026-10-01', TODAY, { current: 0, best: 27 }],
    ['Red yesterday leaves 1', [], '2026-10-01', '2026-10-28', { current: 1, best: 26 }],
    ['past Red splits the run', [], '2026-10-01', '2026-10-20', { current: 9, best: 18 }],
    ['a later Red keeps the counter', [red('2026-10-20')], '2026-10-01', '2026-10-05', { current: 9, best: 14 }],
    // last Red day Oct 20, installed Oct 27: a Red on Oct 2 leaves Oct 3..19 = 17
    ['a run up to a last Red day counts', [red('2026-10-20')], '2026-10-27', '2026-10-02', { current: 9, best: 17 }],
    ['before a start-today install it counts back', [], '2026-10-27', '2026-10-01', { current: 28, best: 28 }],
    ['replaces the color already logged that day', [day('2026-10-20', 0, true)], '2026-10-01', '2026-10-20', { current: 9, best: 18 }],
  ])('%s', (_name, days, installDate, date, expected) => {
    expect(streaksIfRed(days, installDate, date, TODAY)).toEqual(expected);
  });

  it('does not change the days it is given', () => {
    const days = [day('2026-10-20', 0, true)];
    streaksIfRed(days, '2026-10-01', '2026-10-20', TODAY);
    expect(days).toEqual([day('2026-10-20', 0, true)]);
  });
});
