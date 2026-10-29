import { afterEach, describe, expect, it, jest, test } from '@jest/globals';

import {
  addDays,
  compareDates,
  datesBetween,
  dayNumber,
  dayOfWeek,
  daysInMonth,
  diffDays,
  formatLong,
  formatMonthYear,
  formatShort,
  formatWeekdayLetter,
  isValidLocalDate,
  todayLocal,
  toLocalDate,
} from '@/domain/dates';

describe('toLocalDate', () => {
  test.each<[string, Date, string]>([
    ['start of day', new Date(2026, 9, 29, 0, 0, 0), '2026-10-29'],
    ['end of day', new Date(2026, 9, 29, 23, 59, 59, 999), '2026-10-29'],
    ['pads month and day', new Date(2026, 0, 5, 12), '2026-01-05'],
    ['US DST start day', new Date(2026, 2, 8, 12), '2026-03-08'],
    ['just after US DST start', new Date(2026, 2, 8, 3, 30), '2026-03-08'],
    ['US DST end day', new Date(2026, 10, 1, 1, 30), '2026-11-01'],
    ['pads a 3-digit year', new Date(999, 11, 31, 12), '0999-12-31'],
  ])('%s', (_name, date, expected) => {
    expect(toLocalDate(date)).toBe(expected);
  });

  it('uses local getters, not UTC', () => {
    const d = new Date(2026, 9, 29, 23, 30);
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(toLocalDate(d)).toBe(local);
  });
});

describe('todayLocal', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test.each<[Date, string]>([
    [new Date(2026, 9, 29, 0, 0, 1), '2026-10-29'],
    [new Date(2026, 9, 29, 23, 59, 59), '2026-10-29'],
    [new Date(2026, 11, 31, 23, 59, 59), '2026-12-31'],
  ])('at %s is %s', (now, expected) => {
    jest.useFakeTimers({ now });
    expect(todayLocal()).toBe(expected);
  });
});

describe('isValidLocalDate', () => {
  test.each(['2026-10-29', '2024-02-29', '2000-02-29', '2026-12-31', '2026-01-01', '2026-04-30'])(
    'accepts %s',
    (s) => {
      expect(isValidLocalDate(s)).toBe(true);
    },
  );

  test.each([
    '2026-02-29',
    '1900-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-10-00',
    '2026-10-32',
    '2026-04-31',
    '2026-1-01',
    '26-10-29',
    '2026/10/29',
    '',
    ' 2026-10-29',
    '2026-10-29 ',
    '2026-10-29T00:00',
    'abcd-ef-gh',
  ])('rejects %p', (s) => {
    expect(isValidLocalDate(s)).toBe(false);
  });

  it('rejects non-strings at runtime', () => {
    expect(isValidLocalDate(20261029 as unknown as string)).toBe(false);
    expect(isValidLocalDate(null as unknown as string)).toBe(false);
  });
});

describe('daysInMonth', () => {
  test.each<[number, number, number]>([
    [2026, 1, 31],
    [2026, 2, 28],
    [2024, 2, 29],
    [2000, 2, 29],
    [1900, 2, 28],
    [2026, 4, 30],
    [2026, 10, 31],
    [2026, 11, 30],
    [2026, 12, 31],
  ])('%i-%i has %i days', (year, month, expected) => {
    expect(daysInMonth(year, month)).toBe(expected);
  });
});

describe('dayNumber', () => {
  test.each<[string, number]>([
    ['1970-01-01', 0],
    ['1970-01-02', 1],
    ['1969-12-31', -1],
    ['2026-10-29', Date.UTC(2026, 9, 29) / 86_400_000],
    ['2026-03-08', Date.UTC(2026, 2, 8) / 86_400_000],
    ['2026-11-01', Date.UTC(2026, 10, 1) / 86_400_000],
    ['2024-02-29', Date.UTC(2024, 1, 29) / 86_400_000],
  ])('%s -> %i', (s, expected) => {
    expect(dayNumber(s)).toBe(expected);
  });

  it('handles years below 100 (no 19xx mapping)', () => {
    expect(dayNumber('0050-01-01')).toBe(Math.round(new Date('0050-01-01T00:00:00Z').getTime() / 86_400_000));
  });

  test.each(['2026-02-30', 'nope', '2026-10-29T00:00:00Z'])('throws for %p', (s) => {
    expect(() => dayNumber(s)).toThrow(RangeError);
  });
});

describe('addDays', () => {
  test.each<[string, number, string]>([
    // US DST start (2026-03-08) and end (2026-11-01)
    ['2026-03-07', 1, '2026-03-08'],
    ['2026-03-08', 1, '2026-03-09'],
    ['2026-03-07', 2, '2026-03-09'],
    ['2026-03-09', -1, '2026-03-08'],
    ['2026-03-09', -2, '2026-03-07'],
    ['2026-03-01', 14, '2026-03-15'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-11-01', 1, '2026-11-02'],
    ['2026-11-02', -1, '2026-11-01'],
    ['2026-11-02', -2, '2026-10-31'],
    ['2026-10-25', 14, '2026-11-08'],
    // month boundaries
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-02-29', 1, '2024-03-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2024-03-01', -1, '2024-02-29'],
    ['2026-04-30', 1, '2026-05-01'],
    ['2026-10-29', -28, '2026-10-01'],
    // year boundaries
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-10-29', 365, '2027-10-29'],
    ['2024-01-01', 366, '2025-01-01'],
    ['2026-10-29', 0, '2026-10-29'],
  ])('addDays(%s, %i) = %s', (s, n, expected) => {
    expect(addDays(s, n)).toBe(expected);
  });

  it('walks every day of 2026 without skipping or repeating', () => {
    const seen: string[] = [];
    let d = '2026-01-01';
    for (let i = 0; i < 365; i++) {
      seen.push(d);
      const next = addDays(d, 1);
      expect(isValidLocalDate(next)).toBe(true);
      expect(next > d).toBe(true);
      expect(diffDays(d, next)).toBe(1);
      d = next;
    }
    expect(d).toBe('2027-01-01');
    expect(new Set(seen).size).toBe(365);
  });

  it('rejects fractional days', () => {
    expect(() => addDays('2026-10-29', 0.5)).toThrow(RangeError);
  });
});

describe('diffDays', () => {
  test.each<[string, string, number]>([
    ['2026-10-29', '2026-10-29', 0],
    ['2026-10-28', '2026-10-29', 1],
    ['2026-10-29', '2026-10-01', -28],
    ['2026-03-07', '2026-03-09', 2],
    ['2026-10-31', '2026-11-02', 2],
    ['2026-03-01', '2026-04-01', 31],
    ['2026-02-01', '2026-03-01', 28],
    ['2026-01-01', '2027-01-01', 365],
    ['2024-01-01', '2025-01-01', 366],
  ])('diffDays(%s, %s) = %i', (from, to, expected) => {
    expect(diffDays(from, to)).toBe(expected);
  });
});

describe('compareDates', () => {
  test.each<[string, string, number]>([
    ['2026-10-28', '2026-10-29', -1],
    ['2026-10-29', '2026-10-28', 1],
    ['2026-10-29', '2026-10-29', 0],
    ['2026-09-30', '2026-10-01', -1],
    ['2025-12-31', '2026-01-01', -1],
  ])('compareDates(%s, %s) = %i', (a, b, expected) => {
    expect(Math.sign(compareDates(a, b))).toBe(expected);
  });

  it('sorts dates chronologically', () => {
    expect(['2026-11-01', '2025-12-31', '2026-10-29', '2026-03-08'].sort(compareDates)).toEqual([
      '2025-12-31',
      '2026-03-08',
      '2026-10-29',
      '2026-11-01',
    ]);
  });
});

describe('datesBetween', () => {
  test.each<[string, string, string, string[]]>([
    ['single day', '2026-10-29', '2026-10-29', ['2026-10-29']],
    ['start after end', '2026-10-30', '2026-10-29', []],
    ['across DST start', '2026-03-07', '2026-03-10', ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']],
    ['across DST end', '2026-10-31', '2026-11-02', ['2026-10-31', '2026-11-01', '2026-11-02']],
    ['across a year', '2026-12-30', '2027-01-02', ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']],
    ['across Feb in a leap year', '2024-02-28', '2024-03-01', ['2024-02-28', '2024-02-29', '2024-03-01']],
  ])('%s', (_name, start, end, expected) => {
    expect(datesBetween(start, end)).toEqual(expected);
  });

  it('returns a full month inclusive', () => {
    const days = datesBetween('2026-10-01', '2026-10-31');
    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2026-10-01');
    expect(days[30]).toBe('2026-10-31');
  });
});

describe('dayOfWeek', () => {
  test.each<[string, number]>([
    ['2026-10-25', 0],
    ['2026-10-28', 3],
    ['2026-10-29', 4],
    ['2026-10-31', 6],
    ['2026-10-01', 4],
    ['2026-03-08', 0],
    ['2026-11-01', 0],
    ['1970-01-01', 4],
    ['1969-12-28', 0],
    ['2027-01-01', 5],
  ])('%s -> %i', (s, expected) => {
    expect(dayOfWeek(s)).toBe(expected);
  });
});

describe('formatting', () => {
  test.each<[string, string]>([
    ['2026-10-29', 'Thursday, October 29'],
    ['2026-03-08', 'Sunday, March 8'],
    ['2026-11-01', 'Sunday, November 1'],
    ['2027-01-01', 'Friday, January 1'],
  ])('formatLong(%s) = %s', (s, expected) => {
    expect(formatLong(s)).toBe(expected);
  });

  test.each<[string, string]>([
    ['2026-10-28', 'Wed, Oct 28'],
    ['2026-10-29', 'Thu, Oct 29'],
    ['2026-09-01', 'Tue, Sep 1'],
    ['2026-05-01', 'Fri, May 1'],
  ])('formatShort(%s) = %s', (s, expected) => {
    expect(formatShort(s)).toBe(expected);
  });

  it('formatWeekdayLetter gives S M T W T F S for a Sunday-first week', () => {
    expect(datesBetween('2026-10-25', '2026-10-31').map(formatWeekdayLetter).join('')).toBe('SMTWTFS');
    expect(formatWeekdayLetter('2026-10-28')).toBe('W');
  });

  test.each<[number, number, string]>([
    [2026, 10, 'October 2026'],
    [2027, 1, 'January 2027'],
    [2026, 12, 'December 2026'],
  ])('formatMonthYear(%i, %i) = %s', (year, month, expected) => {
    expect(formatMonthYear(year, month)).toBe(expected);
  });

  test.each([0, 13])('formatMonthYear rejects month %i', (month) => {
    expect(() => formatMonthYear(2026, month)).toThrow(RangeError);
  });
});
