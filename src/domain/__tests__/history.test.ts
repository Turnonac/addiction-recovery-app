import { describe, expect, it, test } from '@jest/globals';

import { datesBetween } from '@/domain/dates';
import { backupNudgeDue, monthGrid, monthSummary, recentUnloggedDates, weekStrip } from '@/domain/history';
import type { ColorLevel, DayLog } from '@/domain/types';

const TODAY = '2026-10-29';

const day = (date: string, color: ColorLevel | null, checkedIn = false): DayLog => ({ date, color, checkedIn });

describe('monthGrid', () => {
  it('October 2026 starts on Thursday: 4 leading nulls, 35 cells', () => {
    const grid = monthGrid(2026, 10);
    expect(grid).toHaveLength(35);
    expect(grid.slice(0, 4)).toEqual([null, null, null, null]);
    expect(grid[4]).toBe('2026-10-01');
    expect(grid[34]).toBe('2026-10-31');
    expect(grid.filter((c) => c !== null)).toEqual(datesBetween('2026-10-01', '2026-10-31'));
  });

  test.each<[number, number, number, number, number]>([
    // year, month, leading nulls, trailing nulls, total cells
    [2026, 10, 4, 0, 35],
    [2026, 2, 0, 0, 28], // Feb 2026 starts on Sunday: exactly 4 weeks
    [2026, 8, 6, 5, 42], // Aug 2026 starts on Saturday: 6 weeks
    [2026, 11, 0, 5, 35], // Nov 2026 starts on Sunday
    [2024, 2, 4, 2, 35], // leap February, starts on Thursday
    [2026, 12, 2, 2, 35],
  ])('%i-%i: %i leading, %i trailing, %i cells', (year, month, leading, trailing, total) => {
    const grid = monthGrid(year, month);
    expect(grid).toHaveLength(total);
    expect(grid.length % 7).toBe(0);
    expect(grid.findIndex((c) => c !== null)).toBe(leading);
    expect(grid.length - 1 - grid.findLastIndex((c) => c !== null)).toBe(trailing);
  });
});

describe('monthSummary', () => {
  const days: DayLog[] = [
    day('2026-09-30', 3, true), // other month
    day('2026-10-05', 0, true), // backfilled before install
    day('2026-10-10', 1, true),
    day('2026-10-12', 2, true),
    day('2026-10-15', 3),
    day('2026-10-20', null, true),
    day('2026-10-21', 0),
    day('2026-11-01', 2, true), // future (ignored)
  ];
  const withToday = (color: ColorLevel | null, checkedIn: boolean) => [...days, day(TODAY, color, checkedIn)];

  test.each<[string, DayLog[], number, number, string, string | null, Record<ColorLevel, number>, number, number]>([
    // name, days, year, month, today, installDate, counts, checkIns, eligibleDays
    [
      'current month from installDate; today not checked in is excluded',
      withToday(0, false),
      2026,
      10,
      TODAY,
      '2026-10-10',
      { 0: 3, 1: 1, 2: 1, 3: 1 },
      3, // 10-10, 10-12, 10-20 (10-05 is before install)
      19, // 10-10 .. 10-28
    ],
    [
      'today checked in is included',
      withToday(1, true),
      2026,
      10,
      TODAY,
      '2026-10-10',
      { 0: 2, 1: 2, 2: 1, 3: 1 },
      4,
      20,
    ],
    [
      'no installDate counts from the month start',
      days,
      2026,
      10,
      TODAY,
      null,
      { 0: 2, 1: 1, 2: 1, 3: 1 },
      4,
      28,
    ],
    [
      'install mid past month',
      days,
      2026,
      9,
      TODAY,
      '2026-09-15',
      { 0: 0, 1: 0, 2: 0, 3: 1 },
      1,
      16, // 09-15 .. 09-30
    ],
    [
      'month entirely before install: no eligible days, colors still counted',
      days,
      2026,
      9,
      TODAY,
      '2026-10-10',
      { 0: 0, 1: 0, 2: 0, 3: 1 },
      0,
      0,
    ],
    ['future month is empty', days, 2026, 11, TODAY, '2026-10-10', { 0: 0, 1: 0, 2: 0, 3: 0 }, 0, 0],
    [
      'first of the month, today not checked in',
      [day('2026-11-01', 2)],
      2026,
      11,
      '2026-11-01',
      '2026-10-01',
      { 0: 0, 1: 0, 2: 1, 3: 0 },
      0,
      0,
    ],
    [
      'first of the month, today checked in',
      [day('2026-11-01', null, true)],
      2026,
      11,
      '2026-11-01',
      '2026-10-01',
      { 0: 0, 1: 0, 2: 0, 3: 0 },
      1,
      1,
    ],
    [
      'install today, checked in today',
      [day(TODAY, 0, true)],
      2026,
      10,
      TODAY,
      TODAY,
      { 0: 1, 1: 0, 2: 0, 3: 0 },
      1,
      1,
    ],
    ['install today, not checked in', [day(TODAY, 0)], 2026, 10, TODAY, TODAY, { 0: 1, 1: 0, 2: 0, 3: 0 }, 0, 0],
  ])('%s', (_name, input, year, month, today, installDate, counts, checkIns, eligibleDays) => {
    expect(monthSummary(input, year, month, today, installDate)).toEqual({ counts, checkIns, eligibleDays });
  });
});

describe('recentUnloggedDates', () => {
  const days: DayLog[] = [
    day('2026-10-23', 0),
    day('2026-10-25', 2),
    day('2026-10-27', null, true), // call without a color is still unlogged
  ];

  test.each<[string, DayLog[], string | null, number | undefined, string[]]>([
    [
      'last 7 past days, oldest first, today excluded',
      days,
      '2026-10-01',
      undefined,
      ['2026-10-22', '2026-10-24', '2026-10-26', '2026-10-27', '2026-10-28'],
    ],
    ['clipped to installDate', days, '2026-10-26', undefined, ['2026-10-26', '2026-10-27', '2026-10-28']],
    ['installed today -> none', [], TODAY, undefined, []],
    [
      'no installDate uses the limit',
      [],
      null,
      undefined,
      datesBetween('2026-10-22', '2026-10-28'),
    ],
    ['custom limit', days, '2026-10-01', 3, ['2026-10-26', '2026-10-27', '2026-10-28']],
    [
      'everything logged -> none',
      datesBetween('2026-10-15', '2026-10-28').map((d) => day(d, 1)),
      '2026-10-01',
      undefined,
      [],
    ],
    ['today unlogged is not listed', [day('2026-10-28', 0)], '2026-10-28', undefined, []],
  ])('%s', (_name, input, installDate, limit, expected) => {
    expect(recentUnloggedDates(input, installDate, TODAY, limit)).toEqual(expected);
  });
});

describe('weekStrip', () => {
  it('returns the last 7 days ending today', () => {
    const strip = weekStrip(
      [day('2026-10-22', 3), day('2026-10-23', 0, true), day('2026-10-26', null, true), day(TODAY, 2)],
      TODAY,
    );
    expect(strip).toEqual([
      { date: '2026-10-23', color: 0, checkedIn: true, isToday: false },
      { date: '2026-10-24', color: null, checkedIn: false, isToday: false },
      { date: '2026-10-25', color: null, checkedIn: false, isToday: false },
      { date: '2026-10-26', color: null, checkedIn: true, isToday: false },
      { date: '2026-10-27', color: null, checkedIn: false, isToday: false },
      { date: '2026-10-28', color: null, checkedIn: false, isToday: false },
      { date: TODAY, color: 2, checkedIn: false, isToday: true },
    ]);
  });

  it('crosses a month boundary', () => {
    expect(weekStrip([], '2026-11-02').map((d) => d.date)).toEqual(datesBetween('2026-10-27', '2026-11-02'));
  });
});

describe('backupNudgeDue', () => {
  // ISO instants built from local times so the local calendar day is stable in any time zone.
  const localIso = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

  test.each<[string, string | null, string | null, boolean]>([
    ['never exported, no installDate', null, null, false],
    ['never exported, installed 30 days ago', null, '2026-09-29', true],
    ['never exported, installed 29 days ago', null, '2026-09-30', false],
    ['never exported, installed long ago', null, '2025-01-01', true],
    ['exported 30 days ago', localIso(2026, 9, 29), '2026-01-01', true],
    ['exported 29 days ago', localIso(2026, 9, 30), '2026-01-01', false],
    ['exported late at night 30 local days ago', localIso(2026, 9, 29, 23, 30), '2026-01-01', true],
    ['exported just after midnight 29 local days ago', localIso(2026, 9, 30, 0, 15), '2026-01-01', false],
    ['recent export overrides an old install', localIso(2026, 10, 28), '2025-01-01', false],
    ['old export with a recent install', localIso(2026, 8, 1), '2026-10-28', true],
    ['unreadable export time falls back to installDate', 'garbage', '2026-09-01', true],
    ['unreadable export time, recent install', 'garbage', '2026-10-20', false],
  ])('%s', (_name, lastExportAt, installDate, expected) => {
    expect(backupNudgeDue(lastExportAt, installDate, TODAY)).toBe(expected);
  });
});
