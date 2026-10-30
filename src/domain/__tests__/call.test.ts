import { describe, expect, it, test } from '@jest/globals';

import { callWindow, FIRST_CALL_MAX_DAYS, inCallWindow } from '@/domain/call';
import { datesBetween } from '@/domain/dates';
import type { ColorLevel, DayLog } from '@/domain/types';

const TODAY = '2026-10-29';

const day = (date: string, color: ColorLevel | null, checkedIn = false): DayLog => ({ date, color, checkedIn });

type Settings = { counterStartDate: string | null; installDate: string | null };
const noDates: Settings = { counterStartDate: null, installDate: null };

describe('callWindow: window range', () => {
  test.each<[string, DayLog[], Settings, string | null, string, string]>([
    // name, days, settings, expected lastCallDate, first window day, last window day
    [
      'no calls ever: starts at counterStartDate, capped to 14 days',
      [],
      { counterStartDate: '2026-09-01', installDate: '2026-09-01' },
      null,
      '2026-10-16',
      TODAY,
    ],
    [
      'no calls ever: recent counterStartDate is used as is',
      [],
      { counterStartDate: '2026-10-25', installDate: '2026-10-01' },
      null,
      '2026-10-25',
      TODAY,
    ],
    [
      'no calls ever: falls back to installDate',
      [],
      { counterStartDate: null, installDate: '2026-10-27' },
      null,
      '2026-10-27',
      TODAY,
    ],
    [
      'no calls ever: old installDate is capped too',
      [],
      { counterStartDate: null, installDate: '2026-01-01' },
      null,
      '2026-10-16',
      TODAY,
    ],
    ['no calls ever and no dates: just today', [], noDates, null, TODAY, TODAY],
    [
      'no calls ever: future counterStartDate still includes today',
      [],
      { counterStartDate: '2026-11-03', installDate: null },
      null,
      TODAY,
      TODAY,
    ],
    [
      'last call yesterday: only today',
      [day('2026-10-28', 0, true)],
      { counterStartDate: '2026-09-01', installDate: '2026-09-01' },
      '2026-10-28',
      TODAY,
      TODAY,
    ],
    [
      'starts the day after the most recent call',
      [day('2026-10-20', 1, true), day('2026-10-24', 0, true), day('2026-10-22', 2, true)],
      noDates,
      '2026-10-24',
      '2026-10-25',
      TODAY,
    ],
    [
      'a call marked without a color still counts as a call',
      [day('2026-10-26', null, true)],
      noDates,
      '2026-10-26',
      '2026-10-27',
      TODAY,
    ],
    [
      'after the first call the 14-day cap no longer applies',
      [day('2026-09-01', 0, true)],
      { counterStartDate: '2026-08-01', installDate: '2026-08-01' },
      '2026-09-01',
      '2026-09-02',
      TODAY,
    ],
    [
      'check-ins dated after today are ignored',
      [day('2026-10-26', 0, true), day('2026-10-31', null, true)],
      noDates,
      '2026-10-26',
      '2026-10-27',
      TODAY,
    ],
  ])('%s', (_name, days, settings, lastCallDate, first, last) => {
    const w = callWindow(days, settings, TODAY);
    expect(w.lastCallDate).toBe(lastCallDate);
    expect(w.checkedInToday).toBe(false);
    expect(w.days.map((d) => d.date)).toEqual(datesBetween(first, last));
  });

  it('caps the first-call window at exactly 14 days', () => {
    expect(FIRST_CALL_MAX_DAYS).toBe(14);
    const w = callWindow([], { counterStartDate: '2025-01-01', installDate: null }, TODAY);
    expect(w.days).toHaveLength(14);
  });
});

describe('callWindow: today already checked in', () => {
  test.each<[string, DayLog[]]>([
    ['with a color', [day('2026-10-20', 2), day(TODAY, 1, true)]],
    ['without a color yet', [day('2026-10-27', 3), day(TODAY, null, true)]],
  ])('%s -> empty window', (_name, days) => {
    expect(callWindow(days, { counterStartDate: '2026-10-01', installDate: '2026-10-01' }, TODAY)).toEqual({
      lastCallDate: TODAY,
      checkedInToday: true,
      days: [],
      lowest: null,
      unloggedDates: [],
    });
  });
});

describe('callWindow: colors, lowest and unlogged days', () => {
  it('lists each window day with its color and the unlogged ones', () => {
    const days = [
      day('2026-10-25', 3, true), // last call (its Red is not in the window)
      day('2026-10-26', 1),
      // 10-27 missing entirely
      day('2026-10-28', null, false),
      day(TODAY, 2),
    ];
    expect(callWindow(days, noDates, TODAY)).toEqual({
      lastCallDate: '2026-10-25',
      checkedInToday: false,
      days: [
        { date: '2026-10-26', color: 1 },
        { date: '2026-10-27', color: null },
        { date: '2026-10-28', color: null },
        { date: TODAY, color: 2 },
      ],
      lowest: 2,
      unloggedDates: ['2026-10-27', '2026-10-28'],
    });
  });

  test.each<[string, (ColorLevel | null)[], ColorLevel | null]>([
    // colors for 10-26, 10-27, 10-28, 10-29 (window after a call on 10-25)
    ['lowest = max severity (Red)', [0, 3, 1, 0], 3],
    ['lowest = max severity (Yellow)', [1, null, 2, 0], 2],
    ['all Green', [0, 0, 0, 0], 0],
    ['nothing logged -> null', [null, null, null, null], null],
    ['only today logged', [null, null, null, 1], 1],
  ])('%s', (_name, colors, lowest) => {
    const dates = datesBetween('2026-10-26', TODAY);
    const days: DayLog[] = [day('2026-10-25', 0, true)];
    colors.forEach((c, i) => {
      if (c !== null) days.push(day(dates[i], c));
    });
    const w = callWindow(days, noDates, TODAY);
    expect(w.lowest).toBe(lowest);
    expect(w.unloggedDates).toEqual(dates.filter((_d, i) => colors[i] === null));
  });

  it('first-call window includes unlogged days from the start date', () => {
    const w = callWindow([day('2026-10-27', 2)], { counterStartDate: '2026-10-26', installDate: '2026-10-26' }, TODAY);
    expect(w.days).toEqual([
      { date: '2026-10-26', color: null },
      { date: '2026-10-27', color: 2 },
      { date: '2026-10-28', color: null },
      { date: TODAY, color: null },
    ]);
    expect(w.unloggedDates).toEqual(['2026-10-26', '2026-10-28', TODAY]);
    expect(w.lowest).toBe(2);
  });

  it('ignores colors outside the window', () => {
    const w = callWindow([day('2026-10-01', 3), day('2026-10-27', 0, true), day('2026-10-28', 1)], noDates, TODAY);
    expect(w.lowest).toBe(1);
  });
});

describe('inCallWindow', () => {
  const started: Settings = { counterStartDate: '2026-10-01', installDate: '2026-10-01' };
  test.each<[string, DayLog[], string, boolean]>([
    ['a day after the last call', [day('2026-10-25', 0, true)], '2026-10-27', true],
    ['today with no call yet today', [day('2026-10-25', 0, true)], TODAY, true],
    ['the last call day itself', [day('2026-10-25', 0, true)], '2026-10-25', false],
    ['a day before the last call', [day('2026-10-25', 0, true)], '2026-10-20', false],
    ['any day once today is checked in', [day(TODAY, 0, true)], '2026-10-28', false],
    ['no calls: inside the first 14 days', [], '2026-10-16', true],
    ['no calls: older than the first 14 days', [], '2026-10-15', false],
  ])('%s', (_name, days, date, expected) => {
    expect(inCallWindow(days, started, TODAY, date)).toBe(expected);
  });
});
