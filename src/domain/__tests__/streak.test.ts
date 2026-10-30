import { describe, expect, it, test } from '@jest/globals';

import { bestStreak, currentStreak, redDates, streaksIfRed } from '@/domain/streak';
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

describe('currentStreak', () => {
  test.each<[string, DayLog[], string | null, number | null]>([
    ['no anchor at all -> null', [], null, null],
    ['only non-Red days and no start -> null', [day('2026-10-20', 2), day('2026-10-21', 0)], null, null],
    ['only a future Red and no start -> null', [red('2026-11-05')], null, null],
    ['counts from counterStartDate before any Red', [], '2026-10-01', 28],
    ['start today -> 0', [], TODAY, 0],
    ['Red today -> 0', [red(TODAY)], '2026-10-01', 0],
    ['Red yesterday -> 1', [red('2026-10-28')], null, 1],
    ['consecutive Reds count from the last one', [red('2026-10-25'), red('2026-10-26'), red('2026-10-27')], null, 2],
    ['Red after counterStartDate', [red('2026-10-20')], '2026-10-01', 9],
    ['Red before counterStartDate counts from the start date', [red('2026-09-01')], '2026-10-01', 28],
    ['future Red is ignored', [red('2026-10-30'), red('2026-12-01')], '2026-10-01', 28],
    [
      'unlogged and non-Red days never reset',
      [day('2026-10-05', 2), day('2026-10-10', 1), day('2026-10-28', null, true)],
      '2026-10-01',
      28,
    ],
    ['future counterStartDate is clamped to 0', [], '2026-11-02', 0],
    ['duplicate Red rows count once', [red('2026-10-19'), red('2026-10-19')], null, 10],
  ])('%s', (_name, days, start, expected) => {
    expect(currentStreak(days, start, TODAY)).toBe(expected);
  });

  it('counts across DST changes by calendar day', () => {
    expect(currentStreak([red('2026-03-07')], null, '2026-03-09')).toBe(2);
    expect(currentStreak([red('2026-10-31')], null, '2026-11-02')).toBe(2);
  });
});

describe('bestStreak', () => {
  test.each<[string, DayLog[], string | null, number | null]>([
    ['no anchor at all -> null', [], null, null],
    ['only a future Red and no start -> null', [red('2026-11-05')], null, null],
    ['start date only = current streak', [], '2026-10-01', 28],
    ['Red today only -> 0', [red(TODAY)], null, 0],
    [
      // runs: Sep1→Sep11 = 9, Sep11→Sep12 = 0, Sep12→Oct27 = 44; current 2
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
      // anchors: Aug1, Sep30 (Reds), Oct25 (start): run Aug1→Sep30 = 59; Sep30→Oct25
      // ends at the start, not a Red, so it is no run; current 4
      'Reds before counterStartDate still form runs',
      [red('2026-08-01'), red('2026-09-30')],
      '2026-10-25',
      59,
    ],
    [
      // anchors: Sep1 (Red), Sep21 (start): Sep1→Sep21 is no run; current 38
      'Red before counterStartDate, current run longest',
      [red('2026-09-01')],
      '2026-09-21',
      38,
    ],
    [
      // 'Start counting today' on Oct 27, then a Red backfilled on Oct 1: the untracked
      // gap up to the start is not a clean run, so best stays the current 2 (not 25)
      'a Red before the start date does not raise best',
      [red('2026-10-01')],
      '2026-10-27',
      2,
    ],
    [
      // a Red on the start date itself ends the run before it: Sep1→Oct1 = 29; current 28
      'a Red on counterStartDate ends a run',
      [red('2026-09-01'), red('2026-10-01')],
      '2026-10-01',
      29,
    ],
    ['Reds only, no counterStartDate', [red('2026-10-01'), red('2026-10-20')], null, 18],
    ['future Red is ignored', [red('2026-10-01'), red('2026-11-15')], null, 28],
    ['duplicate Red rows do not create a -1 run', [red('2026-10-10'), red('2026-10-10')], null, 19],
    [
      'unlogged and non-Red days never break a run',
      [day('2026-10-05', 2), red('2026-10-10'), day('2026-10-12', 1)],
      '2026-09-01',
      38,
    ],
  ])('%s', (_name, days, start, expected) => {
    expect(bestStreak(days, start, TODAY)).toBe(expected);
  });

  test.each<[string, DayLog[], string, string | null, number]>([
    // "My last Red day was Oct 1" (before install): Sep1→Oct1 = 29 is a run; current 28
    ['a named last Red day before install ends a run', [red('2026-09-01')], '2026-10-01', '2026-10-20', 29],
    // "Start counting today" (start = install): no run up to the start; current 28
    ['a start-today start does not end a run', [red('2026-09-01')], '2026-10-01', '2026-10-01', 28],
    ['no installDate: the start is not a Red', [red('2026-09-01')], '2026-10-01', null, 28],
  ])('with installDate: %s', (_name, days, start, installDate, expected) => {
    expect(bestStreak(days, start, TODAY, installDate)).toBe(expected);
  });

  it('is never below the current streak', () => {
    const cases: [DayLog[], string | null][] = [
      [[red('2026-10-01'), red('2026-10-02')], null],
      [[red('2026-01-01')], '2026-06-01'],
      [[], '2026-10-29'],
      [[red('2026-10-28')], '2026-10-27'],
    ];
    for (const [days, start] of cases) {
      const best = bestStreak(days, start, TODAY);
      const current = currentStreak(days, start, TODAY);
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
    ['before the start date nothing changes', [], '2026-10-27', '2026-10-01', { current: 2, best: 2 }],
    ['replaces the color already logged that day', [day('2026-10-20', 0, true)], '2026-10-01', '2026-10-20', { current: 9, best: 18 }],
  ])('%s', (_name, days, start, date, expected) => {
    expect(streaksIfRed(days, start, date, TODAY)).toEqual(expected);
  });

  it('counts the run up to a named last Red day', () => {
    // "My last Red day was Oct 20" on Oct 27; a Red backfilled on Oct 2 leaves Oct 3..19 = 17.
    expect(streaksIfRed([], '2026-10-20', '2026-10-02', TODAY, '2026-10-27')).toEqual({ current: 9, best: 17 });
    expect(streaksIfRed([], '2026-10-20', '2026-10-02', TODAY)).toEqual({ current: 9, best: 9 });
  });

  it('does not change the days it is given', () => {
    const days = [day('2026-10-20', 0, true)];
    streaksIfRed(days, '2026-10-01', '2026-10-20', TODAY);
    expect(days).toEqual([day('2026-10-20', 0, true)]);
  });
});
