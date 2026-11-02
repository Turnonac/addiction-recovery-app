import { describe, expect, it, test } from '@jest/globals';

import { callWindow, FIRST_CALL_MAX_DAYS, inCallWindow } from '@/domain/call';
import { datesBetween } from '@/domain/dates';
import type { CallWindow, ColorLevel, DayLog } from '@/domain/types';

const TODAY = '2026-10-29';
const YESTERDAY = '2026-10-28';

const day = (date: string, color: ColorLevel | null, checkedIn = false): DayLog => ({ date, color, checkedIn });

type Settings = { installDate: string | null };
const noDates: Settings = { installDate: null };

const EMPTY_FIRST_CALL: CallWindow = {
  lastCallDate: null,
  checkedInToday: false,
  days: [],
  lowest: null,
  unloggedDates: [],
};

describe('callWindow: window range', () => {
  test.each<[string, DayLog[], Settings, string | null, string]>([
    // name, days, settings, expected lastCallDate, first window day (the last is always yesterday)
    [
      'no calls ever: starts at installDate, capped to the 14 days ending yesterday',
      [],
      { installDate: '2026-09-01' },
      null,
      '2026-10-15',
    ],
    [
      'no calls ever: starts at a recent last Red day before install',
      [day('2026-10-25', 3)],
      { installDate: '2026-10-27' },
      null,
      '2026-10-25',
    ],
    [
      'no calls ever: Reds after install do not move the start',
      [day('2026-10-28', 3)],
      { installDate: '2026-10-27' },
      null,
      '2026-10-27',
    ],
    [
      'no calls ever: an old last Red day is capped too',
      [day('2026-01-01', 3)],
      { installDate: '2026-02-01' },
      null,
      '2026-10-15',
    ],
    ['no calls ever, installed yesterday: just yesterday', [], { installDate: YESTERDAY }, null, YESTERDAY],
    [
      'first call on install day: a last Red day from setup is still listed',
      [day('2026-10-20', 3)],
      { installDate: TODAY },
      null,
      '2026-10-20',
    ],
    [
      'last call yesterday: only yesterday (that call covered it only up to the call)',
      [day(YESTERDAY, 0, true)],
      { installDate: '2026-09-01' },
      YESTERDAY,
      YESTERDAY,
    ],
    [
      'daily calls: only the last call day',
      [day('2026-10-25', 0, true), day('2026-10-26', 1, true), day('2026-10-27', 0, true), day(YESTERDAY, 2, true)],
      { installDate: '2026-10-01' },
      YESTERDAY,
      YESTERDAY,
    ],
    [
      'starts on the most recent call day, inclusive',
      [day('2026-10-20', 1, true), day('2026-10-24', 0, true), day('2026-10-22', 2, true)],
      noDates,
      '2026-10-24',
      '2026-10-24',
    ],
    [
      'a call marked without a color still counts as a call',
      [day('2026-10-26', null, true)],
      noDates,
      '2026-10-26',
      '2026-10-26',
    ],
    [
      'after the first call the 14-day cap no longer applies',
      [day('2026-09-01', 0, true)],
      { installDate: '2026-08-01' },
      '2026-09-01',
      '2026-09-01',
    ],
    [
      'check-ins dated after today are ignored',
      [day('2026-10-26', 0, true), day('2026-10-31', null, true)],
      noDates,
      '2026-10-26',
      '2026-10-26',
    ],
  ])('%s', (_name, days, settings, lastCallDate, first) => {
    const w = callWindow(days, settings, TODAY);
    expect(w.lastCallDate).toBe(lastCallDate);
    expect(w.checkedInToday).toBe(false);
    expect(w.days.map((d) => d.date)).toEqual(datesBetween(first, YESTERDAY));
  });

  it('caps the first-call window at exactly 14 days, ending yesterday', () => {
    expect(FIRST_CALL_MAX_DAYS).toBe(14);
    const w = callWindow([], { installDate: '2025-01-01' }, TODAY);
    expect(w.days).toHaveLength(14);
    expect(w.days[0]?.date).toBe('2026-10-15');
    expect(w.days.at(-1)?.date).toBe(YESTERDAY);
  });
});

describe('callWindow: empty before the first call when it would start after yesterday', () => {
  test.each<[string, DayLog[], Settings]>([
    ['first call on install day', [], { installDate: TODAY }],
    ['no installDate and no Reds', [], noDates],
    ['a future installDate', [], { installDate: '2026-11-03' }],
    ['install day with a Red logged today', [day(TODAY, 3)], { installDate: TODAY }],
  ])('%s -> empty window', (_name, days, settings) => {
    expect(callWindow(days, settings, TODAY)).toEqual(EMPTY_FIRST_CALL);
  });
});

describe('callWindow: today already checked in', () => {
  test.each<[string, DayLog[]]>([
    ['with a color', [day('2026-10-20', 2), day(TODAY, 1, true)]],
    ['without a color yet', [day('2026-10-27', 3), day(TODAY, null, true)]],
    ['after a call yesterday too', [day(YESTERDAY, 3, true), day(TODAY, null, true)]],
  ])('%s -> empty window', (_name, days) => {
    expect(callWindow(days, { installDate: '2026-10-01' }, TODAY)).toEqual({
      lastCallDate: TODAY,
      checkedInToday: true,
      days: [],
      lowest: null,
      unloggedDates: [],
    });
  });
});

describe('callWindow: a call that ran past midnight', () => {
  // The call started yesterday before midnight and ended today: the call screen credits it
  // to yesterday, so today has no call yet and the next call still covers yesterday.
  const days = [day('2026-10-27', 0, true), day(YESTERDAY, null, true)];

  it('leaves today unchecked and lists the call day for the next call', () => {
    expect(callWindow(days, noDates, TODAY)).toEqual({
      lastCallDate: YESTERDAY,
      checkedInToday: false,
      days: [{ date: YESTERDAY, color: null }],
      lowest: null,
      unloggedDates: [YESTERDAY],
    });
  });

  it('shows the call day’s finished color once it is logged', () => {
    const w = callWindow([day('2026-10-27', 0, true), day(YESTERDAY, 2, true)], noDates, TODAY);
    expect(w.days).toEqual([{ date: YESTERDAY, color: 2 }]);
    expect(w.lowest).toBe(2);
    expect(w.unloggedDates).toEqual([]);
  });
});

describe('callWindow: colors, lowest and unlogged days', () => {
  it('lists each window day with its color and the unlogged ones, but never today', () => {
    const days = [
      day('2026-10-24', 3), // before the last call: not in the window
      day('2026-10-25', 3, true), // last call day: in the window with its finished color
      day('2026-10-26', 1),
      // 10-27 missing entirely
      day(YESTERDAY, null, false),
      day(TODAY, 2), // today is told out loud, not listed
    ];
    expect(callWindow(days, noDates, TODAY)).toEqual({
      lastCallDate: '2026-10-25',
      checkedInToday: false,
      days: [
        { date: '2026-10-25', color: 3 },
        { date: '2026-10-26', color: 1 },
        { date: '2026-10-27', color: null },
        { date: YESTERDAY, color: null },
      ],
      lowest: 3,
      unloggedDates: ['2026-10-27', YESTERDAY],
    });
  });

  test.each<[string, (ColorLevel | null)[], ColorLevel | null]>([
    // colors for 10-25 (the last call day), 10-26, 10-27, 10-28
    ['lowest = max severity (Red)', [0, 3, 1, 0], 3],
    ['lowest = max severity (Yellow)', [1, null, 2, 0], 2],
    ['all Green', [0, 0, 0, 0], 0],
    ['nothing logged -> null', [null, null, null, null], null],
    ['only the call day logged', [1, null, null, null], 1],
    ['only yesterday logged', [null, null, null, 2], 2],
  ])('%s', (_name, colors, lowest) => {
    const dates = datesBetween('2026-10-25', YESTERDAY);
    const days: DayLog[] = [day('2026-10-25', colors[0] ?? null, true)];
    colors.slice(1).forEach((c, i) => {
      if (c !== null) days.push(day(dates[i + 1], c));
    });
    const w = callWindow(days, noDates, TODAY);
    expect(w.lowest).toBe(lowest);
    expect(w.unloggedDates).toEqual(dates.filter((_d, i) => colors[i] === null));
  });

  it('first-call window includes unlogged days from the start date through yesterday', () => {
    const w = callWindow([day('2026-10-27', 2), day(TODAY, 3)], { installDate: '2026-10-26' }, TODAY);
    expect(w.days).toEqual([
      { date: '2026-10-26', color: null },
      { date: '2026-10-27', color: 2 },
      { date: YESTERDAY, color: null },
    ]);
    expect(w.unloggedDates).toEqual(['2026-10-26', YESTERDAY]);
    expect(w.lowest).toBe(2);
  });

  it('ignores colors outside the window, today included', () => {
    const w = callWindow(
      [day('2026-10-01', 3), day('2026-10-26', 3), day('2026-10-27', 0, true), day(YESTERDAY, 1), day(TODAY, 3)],
      noDates,
      TODAY,
    );
    expect(w.lowest).toBe(1);
  });
});

describe('inCallWindow', () => {
  const started: Settings = { installDate: '2026-10-01' };
  test.each<[string, DayLog[], string, boolean]>([
    ['a day after the last call', [day('2026-10-25', 0, true)], '2026-10-27', true],
    ['yesterday', [day('2026-10-25', 0, true)], YESTERDAY, true],
    ['the last call day itself', [day('2026-10-25', 0, true)], '2026-10-25', true],
    ['today, with no call yet today', [day('2026-10-25', 0, true)], TODAY, false],
    ['a day before the last call', [day('2026-10-25', 0, true)], '2026-10-24', false],
    ['any day once today is checked in', [day(TODAY, 0, true)], YESTERDAY, false],
    ['no calls: inside the first 14 days', [], '2026-10-15', true],
    ['no calls: older than the first 14 days', [], '2026-10-14', false],
    ['no calls: today', [], TODAY, false],
  ])('%s', (_name, days, date, expected) => {
    expect(inCallWindow(days, started, TODAY, date)).toBe(expected);
  });

  it('is false for every day on install day before the first call', () => {
    expect(inCallWindow([], { installDate: TODAY }, TODAY, YESTERDAY)).toBe(false);
    expect(inCallWindow([], { installDate: TODAY }, TODAY, TODAY)).toBe(false);
  });
});
