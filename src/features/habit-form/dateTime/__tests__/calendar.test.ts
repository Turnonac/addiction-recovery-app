import { DAY, HOUR, MINUTE } from '@/domain/time';
import {
  addMonths,
  buildMonthGrid,
  clampTs,
  combineDayAndTime,
  dayLabel,
  formatFieldValue,
  isDayDisabled,
  isMonthSelectable,
  monthTitle,
  parseHour,
  parseMinute,
  quickOptions,
  relativeDays,
  relativeToNow,
  setTime,
  shiftMonth,
  stepHour,
  stepMinute,
  weekdayLetters,
} from '../calendar';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime();

describe('buildMonthGrid', () => {
  it('always returns 6 rows of 7 days', () => {
    const grid = buildMonthGrid(2026, 2, 1);
    expect(grid).toHaveLength(6);
    grid.forEach((row) => expect(row).toHaveLength(7));
  });

  it('starts on Monday with leading days from the previous month', () => {
    // 1 March 2026 is a Sunday → six leading February days when weeks start Monday.
    const grid = buildMonthGrid(2026, 2, 1);
    expect(grid[0].slice(0, 6).every((c) => !c.inMonth)).toBe(true);
    expect(grid[0][0].day).toBe(23);
    expect(grid[0][6]).toMatchObject({ day: 1, inMonth: true });
    expect(new Date(grid[0][0].ts).getDay()).toBe(1);
  });

  it('starts on Sunday when requested', () => {
    const grid = buildMonthGrid(2026, 2, 0);
    expect(grid[0][0]).toMatchObject({ day: 1, inMonth: true });
    expect(new Date(grid[0][0].ts).getDay()).toBe(0);
  });

  it('contains every day of the month exactly once, at local midnight', () => {
    const cells = buildMonthGrid(2024, 1, 1).flat().filter((c) => c.inMonth);
    expect(cells.map((c) => c.day)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
    cells.forEach((c) => {
      const d = new Date(c.ts);
      expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
    });
  });

  it('handles months that span year boundaries', () => {
    const grid = buildMonthGrid(2026, 0, 1);
    const leading = grid[0].filter((c) => !c.inMonth);
    leading.forEach((c) => expect(new Date(c.ts).getFullYear()).toBe(2025));
  });
});

describe('month helpers', () => {
  it('rotates weekday letters', () => {
    expect(weekdayLetters(1)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(weekdayLetters(0)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });

  it('formats and shifts months', () => {
    expect(monthTitle(2026, 2)).toBe('March 2026');
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2025, 11, 1)).toEqual({ year: 2026, month: 0 });
    expect(shiftMonth(2026, 5, 0)).toEqual({ year: 2026, month: 5 });
  });

  it('knows which months are reachable', () => {
    const max = at(2026, 2, 15, 12);
    expect(isMonthSelectable(2026, 2, undefined, max)).toBe(true);
    expect(isMonthSelectable(2026, 3, undefined, max)).toBe(false);
    expect(isMonthSelectable(2026, 1, at(2026, 2, 1), max)).toBe(false);
  });
});

describe('bounds', () => {
  it('clamps', () => {
    expect(clampTs(5, 0, 10)).toBe(5);
    expect(clampTs(15, 0, 10)).toBe(10);
    expect(clampTs(-5, 0, 10)).toBe(0);
    expect(clampTs(-5)).toBe(-5);
  });

  it('disables days completely outside the range', () => {
    const max = at(2026, 2, 15, 12);
    expect(isDayDisabled(at(2026, 2, 15), undefined, max)).toBe(false);
    expect(isDayDisabled(at(2026, 2, 16), undefined, max)).toBe(true);
    const min = at(2026, 2, 10, 18);
    expect(isDayDisabled(at(2026, 2, 10), min, max)).toBe(false);
    expect(isDayDisabled(at(2026, 2, 9), min, max)).toBe(true);
  });
});

describe('time editing', () => {
  it('moves a time onto another day', () => {
    expect(combineDayAndTime(at(2026, 2, 1), at(2026, 4, 20, 14, 43))).toBe(at(2026, 2, 1, 14, 43));
    expect(setTime(at(2026, 2, 1, 5, 5), 23, 59)).toBe(at(2026, 2, 1, 23, 59));
  });

  it('steps hours within the day', () => {
    expect(stepHour(at(2026, 2, 1, 14, 43), 1)).toBe(at(2026, 2, 1, 15, 43));
  });

  it('steps the hour across midnight instead of wrapping within the day', () => {
    // "−" at 00:xx goes to 23:xx of the previous day (earlier), "+" at 23:xx to 00:xx of the next.
    expect(stepHour(at(2026, 2, 1, 0, 10), -1)).toBe(at(2026, 1, 28, 23, 10));
    expect(stepHour(at(2026, 2, 1, 23, 10), 1)).toBe(at(2026, 2, 2, 0, 10));
    expect(stepHour(at(2026, 0, 1, 0, 5), -1)).toBe(at(2025, 11, 31, 23, 5));
    expect(stepHour(at(2026, 2, 1, 0, 10), -1)).toBeLessThan(at(2026, 2, 1, 0, 10));
    expect(stepHour(at(2026, 2, 1, 23, 10), 1)).toBeGreaterThan(at(2026, 2, 1, 23, 10));
  });

  it('drops seconds when stepping', () => {
    expect(stepHour(at(2026, 2, 1, 14, 43) + 30_000, 1)).toBe(at(2026, 2, 1, 15, 43));
    expect(stepMinute(at(2026, 2, 1, 14, 43) + 30_000, 1)).toBe(at(2026, 2, 1, 14, 45));
  });

  it('never moves the wrong way when the stepped hour is clamped to a bound', () => {
    const max = at(2026, 2, 1, 0, 30);
    const earlier = clampTs(stepHour(at(2026, 2, 1, 0, 20), -1), undefined, max);
    expect(earlier).toBe(at(2026, 1, 28, 23, 20));
    const min = at(2026, 2, 1, 23, 0);
    expect(clampTs(stepHour(at(2026, 2, 1, 23, 40), 1), min)).toBe(at(2026, 2, 2, 0, 40));
  });

  it('snaps minutes to steps of five and carries into the neighbouring hour', () => {
    expect(stepMinute(at(2026, 2, 1, 14, 43), 1)).toBe(at(2026, 2, 1, 14, 45));
    expect(stepMinute(at(2026, 2, 1, 14, 43), -1)).toBe(at(2026, 2, 1, 14, 40));
    expect(stepMinute(at(2026, 2, 1, 14, 40), -1)).toBe(at(2026, 2, 1, 14, 35));
    expect(stepMinute(at(2026, 2, 1, 14, 55), 1)).toBe(at(2026, 2, 1, 15, 0));
    expect(stepMinute(at(2026, 2, 1, 14, 0), -1)).toBe(at(2026, 2, 1, 13, 55));
    expect(stepMinute(at(2026, 2, 1, 23, 58), 1)).toBe(at(2026, 2, 2, 0, 0));
    expect(stepMinute(at(2026, 2, 1, 0, 0), -1)).toBe(at(2026, 1, 28, 23, 55));
  });

  it('adds months with day clamping', () => {
    expect(addMonths(at(2026, 2, 31, 9), -1)).toBe(at(2026, 1, 28, 9));
    expect(addMonths(at(2024, 2, 31, 9), -1)).toBe(at(2024, 1, 29, 9));
    expect(addMonths(at(2026, 0, 15), -1)).toBe(at(2025, 11, 15));
  });

  it('parses typed hours and minutes', () => {
    expect(parseHour('7')).toBe(7);
    expect(parseHour('07')).toBe(7);
    expect(parseHour('24')).toBeNull();
    expect(parseHour('')).toBeNull();
    expect(parseMinute('59')).toBe(59);
    expect(parseMinute('60')).toBeNull();
    expect(parseMinute('a1')).toBeNull();
  });
});

describe('quickOptions', () => {
  const now = at(2026, 2, 29, 14, 43);

  it('offers all four when unbounded', () => {
    const opts = quickOptions(now);
    expect(opts.map((o) => o.label)).toEqual(['Now', 'Yesterday', '1 week ago', '1 month ago']);
    expect(opts[1].value).toBe(at(2026, 2, 28, 14, 43));
    expect(opts[2].value).toBe(at(2026, 2, 22, 14, 43));
    expect(opts[3].value).toBe(at(2026, 1, 28, 14, 43));
  });

  it('drops options before the minimum', () => {
    const opts = quickOptions(now, now - 3 * DAY);
    expect(opts.map((o) => o.key)).toEqual(['now', 'yesterday']);
  });

  it('keeps "Now" when max was captured a moment earlier, clamped to max', () => {
    const max = now - 2000;
    const opts = quickOptions(now, undefined, max);
    expect(opts[0]).toMatchObject({ key: 'now', value: max });
  });

  it('drops "Now" when max is well in the past', () => {
    const opts = quickOptions(now, undefined, now - 2 * HOUR);
    expect(opts.map((o) => o.key)).toEqual(['yesterday', 'week', 'month']);
  });
});

describe('labels', () => {
  const now = at(2026, 2, 29, 14, 43);

  it('formats the field value', () => {
    expect(formatFieldValue(at(2026, 2, 29, 14, 43), now)).toBe('Today, 14:43');
    expect(formatFieldValue(at(2026, 2, 28, 9, 0), now)).toBe('Yesterday, 09:00');
    expect(formatFieldValue(at(2026, 2, 30, 9, 0), now)).toBe('Tomorrow, 09:00');
    expect(formatFieldValue(at(2026, 1, 3, 8, 5), now)).toBe('3 Feb 2026, 08:05');
    expect(formatFieldValue(at(2026, 1, 3, 8, 5), now, 'date')).toBe('3 Feb 2026');
    expect(dayLabel(now, now)).toBe('Today');
  });

  it('describes the distance from now', () => {
    expect(relativeToNow(now - 30 * 1000, now)).toBe('Just now');
    expect(relativeToNow(now - 29 * DAY - 3 * HOUR, now)).toBe('29d 3h ago');
    expect(relativeToNow(now + 2 * HOUR + 5 * MINUTE, now)).toBe('in 2h 5m');
    expect(relativeDays(at(2026, 2, 29, 1), now)).toBe('today');
    expect(relativeDays(at(2026, 2, 28, 23), now)).toBe('1 day ago');
    expect(relativeDays(at(2026, 2, 1), now)).toBe('28 days ago');
    expect(relativeDays(at(2026, 2, 31), now)).toBe('in 2 days');
  });
});
