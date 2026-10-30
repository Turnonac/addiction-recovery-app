import { describe, expect, test } from '@jest/globals';

import type { ColorLevel, DayLog } from '@/domain/types';
import { clearDayText, daysAfterColor, redNoteText } from '@/features/colorLog/colorLog';

const TODAY = '2026-10-29';

const day = (date: string, color: ColorLevel | null, checkedIn = false): DayLog => ({ date, color, checkedIn });

describe('redNoteText', () => {
  test.each<[string, DayLog[], string | null, string, string]>([
    [
      'today, current run is the best',
      [],
      '2026-10-01',
      TODAY,
      'Your counter restarts at 0. Your best streak becomes 27 days. Your history stays.',
    ],
    [
      'today, an older run is longer',
      [day('2026-10-26', 3)],
      '2026-09-01',
      TODAY,
      'Your counter restarts at 0. Your history and best streak stay.',
    ],
    ['today with no counter yet', [], null, TODAY, 'Your counter restarts at 0. Your history and best streak stay.'],
    [
      'a past day after the counter start',
      [],
      '2026-10-01',
      '2026-10-20',
      'Your counter goes back to 9 days. Your best streak becomes 18 days. Your other days stay.',
    ],
    [
      // splits the 19-day run Sep 30 → Oct 20; the 28-day run before it stays the best
      'a past day before a later Red',
      [day('2026-09-30', 3), day('2026-10-20', 3)],
      '2026-09-01',
      '2026-10-05',
      'Your counter stays at 9 days. Your other days and best streak stay.',
    ],
    [
      'a past day before a start-today install',
      [],
      '2026-10-27',
      '2026-10-01',
      'Your counter now counts from that day: 28 days. Your best streak becomes 28 days. Your other days stay.',
    ],
    [
      'a past day with no counter yet',
      [],
      null,
      '2026-10-24',
      'Your counter now counts from that day: 5 days. Your best streak becomes 5 days. Your other days stay.',
    ],
  ])('%s', (_name, days, installDate, date, expected) => {
    expect(redNoteText(days, installDate, date, TODAY)).toBe(expected);
  });
});

describe('daysAfterColor', () => {
  test('applies a worse color and keeps the check-in', () => {
    const days = { '2026-10-28': day('2026-10-28', 0, true) };
    expect(daysAfterColor(days, '2026-10-28', 3, TODAY)).toEqual([day('2026-10-28', 3, true)]);
  });

  test('leaves the days alone when the save would need a confirmation', () => {
    const days = { '2026-10-28': day('2026-10-28', 3) };
    expect(daysAfterColor(days, '2026-10-28', 0, TODAY)).toEqual([day('2026-10-28', 3)]);
  });
});

describe('clearDayText', () => {
  const REMOVED_RED = 'This removes its color (Red). The day goes back to not logged.';

  test.each<[string, DayLog[], string | null, string, string]>([
    ['an unlogged day', [], '2026-10-01', '2026-10-28', 'Nothing is saved for this day.'],
    [
      'a color only',
      [day('2026-10-28', 2)],
      '2026-10-01',
      '2026-10-28',
      'This removes its color (Yellow). The day goes back to not logged.',
    ],
    [
      'a check-in only',
      [day('2026-10-28', null, true)],
      '2026-10-01',
      '2026-10-28',
      'This removes your check-in with Sam. The day goes back to not logged.',
    ],
    [
      // Only Red days anchor the counter, so no counter line.
      'a color and a check-in',
      [day('2026-10-28', 0, true), day('2026-10-20', 3)],
      '2026-10-01',
      '2026-10-28',
      'This removes its color (Green) and your check-in with Sam. The day goes back to not logged.',
    ],
    [
      'a Red today',
      [day(TODAY, 3)],
      '2026-10-01',
      TODAY,
      `${REMOVED_RED} Your counter becomes 28 days. Your best streak becomes 28 days.`,
    ],
    [
      // joins the 8-day and 9-day runs around Oct 10 into one 18-day run
      'a Red before a later Red',
      [day('2026-10-10', 3), day('2026-10-20', 3)],
      '2026-10-01',
      '2026-10-10',
      `${REMOVED_RED} Your counter stays at 9 days. Your best streak becomes 18 days.`,
    ],
    [
      'the last Red day from setup, before install',
      [day('2026-09-20', 3)],
      '2026-10-01',
      '2026-09-20',
      `${REMOVED_RED} Your counter becomes 28 days. Your best streak becomes 28 days.`,
    ],
    [
      'the latest Red, when an older run stays the best',
      [day('2026-10-26', 3), day('2026-10-27', 3)],
      '2026-09-01',
      '2026-10-27',
      `${REMOVED_RED} Your counter becomes 3 days. Your best streak stays at 54 days.`,
    ],
    [
      'a Red with a check-in, one day singular',
      [day('2026-10-20', 3, true), day('2026-10-28', 3)],
      '2026-10-01',
      '2026-10-20',
      'This removes its color (Red) and your check-in with Sam. The day goes back to not logged. ' +
        'Your counter stays at 1 day. Your best streak becomes 26 days.',
    ],
    [
      'a Red with no counter left',
      [day('2026-10-28', 3)],
      null,
      '2026-10-28',
      `${REMOVED_RED} Your counter becomes 0 days. Your best streak becomes 0 days.`,
    ],
  ])('%s', (_name, days, installDate, date, expected) => {
    expect(clearDayText(days, installDate, date, TODAY, 'Sam')).toBe(expected);
  });
});
