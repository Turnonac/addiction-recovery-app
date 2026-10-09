import { DAY, HOUR } from '@/domain/time';
import { archivedSubtitle, deleteHabitMessage } from '../logic/archived';
import { currencyInfo, currencyLabel, filterCurrencies } from '../logic/currency';
import { formatReminderTime, partOfDay, sameTime, stepHour, stepMinute } from '../logic/reminderTime';
import { fullOrder, moveId, moveItem } from '../logic/reorder';
import { CRISIS_RESOURCES, smsUrl, telUrl } from '../logic/support';

describe('moveItem / moveId', () => {
  it('moves up and down', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveId(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c']);
  });

  it('ignores moves past the ends and unknown ids, without mutating input', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(list, 1, 1)).toEqual(['a', 'b']);
    expect(moveId(list, 'zzz', 1)).toEqual(['a', 'b']);
    expect(moveItem(list, 0, 1)).not.toBe(list);
    expect(list).toEqual(['a', 'b']);
  });
});

describe('fullOrder', () => {
  const habits = [
    { id: 'a', order: 0 },
    { id: 'arch2', order: 7 },
    { id: 'b', order: 1 },
    { id: 'arch1', order: 1 },
    { id: 'c', order: 2 },
  ];

  it('puts the active ids first, then the rest by their current order', () => {
    expect(fullOrder(['b', 'a', 'c'], habits)).toEqual(['b', 'a', 'c', 'arch1', 'arch2']);
  });

  it('gives every habit a unique position and does not mutate input', () => {
    const copy = habits.map((h) => ({ ...h }));
    const ids = fullOrder(['c', 'b', 'a'], habits);
    expect(new Set(ids).size).toBe(habits.length);
    expect(habits).toEqual(copy);
  });
});

describe('filterCurrencies', () => {
  it('returns everything for an empty query', () => {
    expect(filterCurrencies('  ').length).toBeGreaterThan(10);
  });

  it('ranks exact code matches first', () => {
    expect(filterCurrencies('eur')[0].code).toBe('EUR');
    expect(filterCurrencies('usd')[0].code).toBe('USD');
  });

  it('matches names (accent-insensitive), name words and symbols', () => {
    expect(filterCurrencies('zloty').map((c) => c.code)).toEqual(['PLN']);
    expect(filterCurrencies('dollar').map((c) => c.code)).toEqual(expect.arrayContaining(['USD', 'CAD', 'AUD']));
    expect(filterCurrencies('€').map((c) => c.code)).toEqual(['EUR']);
    expect(filterCurrencies('krona').map((c) => c.code)).toEqual(['SEK']);
  });

  it('returns nothing for gibberish', () => {
    expect(filterCurrencies('qqqq')).toEqual([]);
  });

  it('describes unknown codes gracefully', () => {
    expect(currencyInfo('USD').symbol).toBe('$');
    expect(currencyInfo('XYZ')).toEqual({ code: 'XYZ', symbol: 'XYZ', name: 'XYZ' });
  });

  it('labels currencies without repeating a symbol that is the code', () => {
    expect(currencyLabel(currencyInfo('EUR'))).toBe('€ EUR');
    expect(currencyLabel(currencyInfo('USD'))).toBe('$ USD');
    expect(currencyLabel(currencyInfo('CHF'))).toBe('CHF');
    expect(currencyLabel(currencyInfo('XYZ'))).toBe('XYZ');
  });
});

describe('reminder time helpers', () => {
  it('formats zero-padded 24h time', () => {
    expect(formatReminderTime({ hour: 9, minute: 0 })).toBe('09:00');
    expect(formatReminderTime({ hour: 21, minute: 5 })).toBe('21:05');
  });

  it('wraps hours', () => {
    expect(stepHour(23, 1)).toBe(0);
    expect(stepHour(0, -1)).toBe(23);
    expect(stepHour(9, 1)).toBe(10);
  });

  it('steps minutes on a 5-minute grid and wraps', () => {
    expect(stepMinute(0, 1)).toBe(5);
    expect(stepMinute(0, -1)).toBe(55);
    expect(stepMinute(55, 1)).toBe(0);
    expect(stepMinute(7, 1)).toBe(10);
    expect(stepMinute(7, -1)).toBe(5);
    expect(stepMinute(30, 1, 15)).toBe(45);
  });

  it('compares times and names the part of day', () => {
    expect(sameTime({ hour: 9, minute: 0 }, { hour: 9, minute: 0 })).toBe(true);
    expect(sameTime({ hour: 9, minute: 0 }, { hour: 9, minute: 5 })).toBe(false);
    expect(partOfDay(8)).toBe('Morning');
    expect(partOfDay(13)).toBe('Afternoon');
    expect(partOfDay(19)).toBe('Evening');
    expect(partOfDay(23)).toBe('Night');
    expect(partOfDay(2)).toBe('Night');
  });
});

describe('archived habit copy', () => {
  it('shows the current streak when the archive date is unknown', () => {
    const now = 1_800_000_000_000;
    expect(archivedSubtitle({ startedAt: now - 29 * DAY - 5 * HOUR }, now)).toBe('Archived · 29 days clean');
    expect(archivedSubtitle({ startedAt: now - DAY }, now)).toBe('Archived · 1 day clean');
    expect(archivedSubtitle({ startedAt: now + DAY }, now)).toBe('Archived · 0 days clean');
  });

  it('freezes the streak at the archive date when it is known', () => {
    const now = 1_800_000_000_000;
    const startedAt = now - 200 * DAY;
    expect(archivedSubtitle({ startedAt, archivedAt: startedAt + 29 * DAY + HOUR }, now)).toBe('Archived · was 29 days clean');
    expect(archivedSubtitle({ startedAt, archivedAt: startedAt - DAY }, now)).toBe('Archived · was 0 days clean');
    expect(archivedSubtitle({ startedAt, archivedAt: null }, now)).toBe('Archived · 200 days clean');
  });

  it('mentions relapse history in the delete message', () => {
    expect(deleteHabitMessage('Smoking', 0)).toContain('“Smoking” will be permanently deleted');
    expect(deleteHabitMessage('Smoking', 1)).toContain('and its 1 relapse will');
    expect(deleteHabitMessage('Smoking', 3)).toContain('and its 3 relapses will');
  });
});

describe('crisis resources', () => {
  it('builds dialable URLs', () => {
    expect(telUrl('1-800-662-4357')).toBe('tel:18006624357');
    expect(smsUrl('988')).toBe('sms:988');
  });

  it('includes the required helplines', () => {
    const ids = CRISIS_RESOURCES.map((r) => r.id);
    expect(ids).toEqual(['emergency', 'samhsa', '988', 'findahelpline']);
    const urls = CRISIS_RESOURCES.flatMap((r) => r.actions.map((a) => a.url));
    expect(urls).toEqual(expect.arrayContaining(['tel:18006624357', 'tel:988', 'https://findahelpline.com']));
  });
});
