import { DAY, HOUR, MINUTE, SECOND } from '@/domain/time';
import type { Habit, Relapse } from '@/types';
import {
  arcPath,
  badgeDate,
  arcSegments,
  barFractions,
  buildStreakHistory,
  counterParts,
  dateTimeLabel,
  fitFontSize,
  focusIndex,
  goalText,
  heroFontSize,
  heroValue,
  milestoneBadges,
  milestoneShort,
  mixHex,
  perDayMinutes,
  perDayMoney,
  polar,
  rangeLabel,
  recentEnded,
  relativeDateTimeLabel,
  streakLabel,
  stripScrollX,
} from '../logic';

const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

function habit(partial: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    kind: 'smoking',
    name: 'Smoking',
    color: '#EF4444',
    icon: 'smoking',
    startedAt: NOW - 29 * DAY,
    firstStartedAt: NOW - 100 * DAY,
    createdAt: NOW - 100 * DAY,
    dailyCost: 10,
    currency: 'USD',
    dailyMinutes: 60,
    goalDays: null,
    reason: '',
    archived: false,
    order: 0,
    ...partial,
  };
}

function relapse(id: string, at: number, streakMs: number, habitId = 'h1'): Relapse {
  return { id, habitId, at, streakMs, triggers: ['stress'], mood: 'cloudy', note: '' };
}

describe('heroValue', () => {
  it('shows whole days from one day on', () => {
    expect(heroValue(31 * DAY + 5 * HOUR)).toEqual({ value: '31', unit: 'DAYS' });
    expect(heroValue(DAY)).toEqual({ value: '1', unit: 'DAY' });
    expect(heroValue(1234 * DAY)).toEqual({ value: '1,234', unit: 'DAYS' });
  });

  it('falls back to hours, then minutes', () => {
    expect(heroValue(5 * HOUR + 59 * MINUTE)).toEqual({ value: '5', unit: 'HOURS' });
    expect(heroValue(HOUR)).toEqual({ value: '1', unit: 'HOUR' });
    expect(heroValue(12 * MINUTE)).toEqual({ value: '12', unit: 'MINUTES' });
    expect(heroValue(MINUTE)).toEqual({ value: '1', unit: 'MINUTE' });
    expect(heroValue(-5)).toEqual({ value: '0', unit: 'MINUTES' });
  });
});

describe('heroFontSize', () => {
  it('shrinks for longer numbers', () => {
    expect(heroFontSize('9')).toBeGreaterThan(heroFontSize('123'));
    expect(heroFontSize('123')).toBeGreaterThan(heroFontSize('1,234'));
    expect(heroFontSize('1,234')).toBeGreaterThan(heroFontSize('12,345,6'));
  });

  it('stays within the 64–72 hero range up to 99,999 days', () => {
    expect(heroFontSize('29')).toBe(72);
    expect(heroFontSize('120')).toBeLessThanOrEqual(72);
    expect(heroFontSize('120')).toBeGreaterThanOrEqual(64);
    expect(heroFontSize('1,234')).toBe(64);
    expect(heroFontSize('12345')).toBe(64);
  });

  it('keeps the hero size inside the 214pt inner disc and shrinks for a smaller ring', () => {
    expect(heroFontSize('1,234', 214)).toBe(64);
    expect(heroFontSize('29', 214)).toBe(72);
    const small = heroFontSize('1,234', 150);
    expect(small).toBeLessThan(64);
    expect(small * (4 * 0.68 + 0.32)).toBeLessThanOrEqual(150);
  });
});

describe('fitFontSize', () => {
  it('keeps the base size when the text fits', () => {
    expect(fitFontSize('$120', 160, 22, 14)).toBe(22);
    expect(fitFontSize('1', 80, 24, 15)).toBe(24);
  });

  it('shrinks long values to fit a narrow card (320pt phone)', () => {
    const size = fitFontSize('€15,422.50', 110, 22, 14);
    expect(size).toBeLessThan(22);
    expect(size).toBeGreaterThanOrEqual(14);
    // 8 wide glyphs + 2 narrow ones must fit in 110pt.
    expect(size * (8 * 0.68 + 2 * 0.32)).toBeLessThanOrEqual(110);
  });

  it('never goes below the minimum or above the base', () => {
    expect(fitFontSize('€1,234,567,890.00', 60, 22, 14)).toBe(14);
    expect(fitFontSize('', 10, 22, 14)).toBe(22);
    expect(fitFontSize('123', 0, 22, 14)).toBe(22);
  });
});

describe('goalText', () => {
  it('formats days and years', () => {
    expect(goalText(60)).toBe('60 days');
    expect(goalText(1)).toBe('1 day');
    expect(goalText(1000)).toBe('1,000 days');
    expect(goalText(365)).toBe('1 year');
    expect(goalText(730)).toBe('2 years');
  });
});

describe('counterParts', () => {
  it('splits into zero-padded parts', () => {
    const parts = counterParts(31 * DAY + 0 * HOUR + 19 * MINUTE + 28 * SECOND);
    expect(parts.map((p) => p.value)).toEqual(['31', '00', '19', '28']);
    expect(parts.map((p) => p.label)).toEqual(['days', 'hrs', 'min', 'sec']);
  });

  it('pads single digits and lets days grow', () => {
    expect(counterParts(3 * DAY + 4 * HOUR + 5 * MINUTE + 6 * SECOND).map((p) => p.value)).toEqual(['03', '04', '05', '06']);
    expect(counterParts(400 * DAY)[0].value).toBe('400');
    expect(counterParts(-1000).map((p) => p.value)).toEqual(['00', '00', '00', '00']);
  });
});

describe('per-day rates', () => {
  it('drops empty cents', () => {
    expect(perDayMoney(4, 'USD')).toBe('$4/day');
    expect(perDayMoney(4.5, 'USD')).toBe('$4.50/day');
    expect(perDayMoney(120, 'UAH')).toBe('₴120/day');
  });

  it('formats minutes', () => {
    expect(perDayMinutes(15)).toBe('15 min/day');
    expect(perDayMinutes(60)).toBe('1h/day');
    expect(perDayMinutes(150)).toBe('2h 30m/day');
  });
});

describe('milestoneShort', () => {
  it('uses the largest whole unit', () => {
    expect([1, 3, 7, 14, 30, 60, 90, 180, 365, 730].map(milestoneShort)).toEqual(['1d', '3d', '1w', '2w', '1m', '2m', '3m', '6m', '1y', '2y']);
    expect(milestoneShort(45)).toBe('45d');
  });
});

describe('milestoneBadges', () => {
  const start = NOW - 29 * DAY;

  it('marks reached, next and future milestones', () => {
    const badges = milestoneBadges(start, 29 * DAY);
    expect(badges.map((b) => b.days)).toEqual([1, 3, 7, 14, 30, 60, 90, 180, 365]);
    expect(badges.filter((b) => b.state === 'reached').map((b) => b.days)).toEqual([1, 3, 7, 14]);
    const next = badges.find((b) => b.state === 'next');
    expect(next?.days).toBe(30);
    expect(next?.progress).toBeCloseTo(29 / 30);
    expect(badges.filter((b) => b.state === 'future')).toHaveLength(4);
    expect(focusIndex(badges)).toBe(4);
  });

  it('centers the focused badge and scrolls back to the start for early ones', () => {
    // 66pt items, 8pt gap, 16pt leading pad, 390pt viewport.
    expect(stripScrollX(0, 390, 66, 8, 16)).toBe(0);
    expect(stripScrollX(1, 390, 66, 8, 16)).toBe(0);
    expect(stripScrollX(6, 390, 66, 8, 16)).toBe(16 + 6 * 74 + 33 - 195);
  });

  it('records when each milestone is reached and which award certificates', () => {
    const badges = milestoneBadges(start, 29 * DAY);
    expect(badges[2].at).toBe(start + 7 * DAY);
    expect(badges.filter((b) => b.certificate).map((b) => b.days)).toEqual([7, 30, 90, 180, 365]);
  });

  it('counts a milestone as reached at the exact moment', () => {
    const badges = milestoneBadges(start, 7 * DAY);
    expect(badges.find((b) => b.days === 7)?.state).toBe('reached');
    expect(badges.find((b) => b.days === 14)?.state).toBe('next');
  });

  it('starts with the first milestone as next', () => {
    const badges = milestoneBadges(start, 0);
    expect(badges[0].state).toBe('next');
    expect(badges[0].progress).toBe(0);
  });

  it('adds yearly milestones past one year', () => {
    const badges = milestoneBadges(start, 400 * DAY);
    expect(badges.map((b) => b.days).slice(-2)).toEqual([365, 730]);
    expect(badges[badges.length - 1].state).toBe('next');
    expect(badges[badges.length - 1].short).toBe('2y');
  });

  it('focuses the last badge when everything is reached', () => {
    const badges = milestoneBadges(start, 365 * DAY);
    // 365 reached → 730 becomes the next one.
    expect(badges[badges.length - 1].days).toBe(730);
    expect(focusIndex(badges)).toBe(badges.length - 1);
  });
});

describe('buildStreakHistory', () => {
  it('lists every streak chronologically with the current one last', () => {
    const h = habit({ startedAt: NOW - 29 * DAY });
    const rs = [
      relapse('b', NOW - 29 * DAY, 33 * DAY),
      relapse('a', NOW - 62 * DAY, 12 * DAY),
      relapse('x', NOW - 5 * DAY, 3 * DAY, 'other-habit'),
    ];
    const hist = buildStreakHistory(h, rs, NOW);
    expect(hist.items.map((i) => i.attempt)).toEqual([1, 2, 3]);
    expect(hist.items.map((i) => i.relapse?.id ?? null)).toEqual(['a', 'b', null]);
    expect(hist.items[0]).toMatchObject({ startAt: NOW - 74 * DAY, endAt: NOW - 62 * DAY, ms: 12 * DAY, current: false });
    expect(hist.items[2]).toMatchObject({ startAt: NOW - 29 * DAY, endAt: NOW, ms: 29 * DAY, current: true });
    expect(hist.attempts).toBe(3);
    expect(hist.relapseCount).toBe(2);
    expect(hist.recordMs).toBe(33 * DAY);
    expect(hist.items.filter((i) => i.isRecord).map((i) => i.attempt)).toEqual([2]);
    expect(hist.totalMs).toBe(74 * DAY);
    expect(hist.averageMs).toBeCloseTo((74 * DAY) / 3);
  });

  it('gives ties to the most recent streak', () => {
    const h = habit({ startedAt: NOW - 10 * DAY });
    const hist = buildStreakHistory(h, [relapse('a', NOW - 10 * DAY, 10 * DAY)], NOW);
    expect(hist.items.map((i) => i.isRecord)).toEqual([false, true]);
  });

  it('handles a habit without relapses', () => {
    const h = habit({ startedAt: NOW - 3 * HOUR });
    const hist = buildStreakHistory(h, [], NOW);
    expect(hist.items).toHaveLength(1);
    expect(hist.items[0]).toMatchObject({ attempt: 1, current: true, isRecord: true, ms: 3 * HOUR });
    expect(hist.averageMs).toBe(3 * HOUR);
  });

  it('never marks a zero-length streak as the record', () => {
    const h = habit({ startedAt: NOW });
    const hist = buildStreakHistory(h, [], NOW);
    expect(hist.items[0].isRecord).toBe(false);
    expect(hist.recordMs).toBe(0);
  });

  it('clamps a start date in the future', () => {
    const h = habit({ startedAt: NOW + HOUR });
    const hist = buildStreakHistory(h, [], NOW);
    expect(hist.items[0].ms).toBe(0);
    expect(hist.items[0].endAt).toBe(NOW + HOUR);
  });

  it('returns the latest ended streaks for the detail screen', () => {
    const h = habit({ startedAt: NOW - DAY });
    const rs = [relapse('a', NOW - 30 * DAY, 5 * DAY), relapse('b', NOW - 10 * DAY, 15 * DAY), relapse('c', NOW - DAY, 9 * DAY)];
    const hist = buildStreakHistory(h, rs, NOW);
    expect(recentEnded(hist, 2).map((i) => i.relapse?.id)).toEqual(['c', 'b']);
    expect(recentEnded(buildStreakHistory(h, [], NOW), 2)).toEqual([]);
  });
});

describe('chart helpers', () => {
  it('scales bars to the longest streak with a minimum sliver', () => {
    const h = habit({ startedAt: NOW - 10 * DAY });
    const hist = buildStreakHistory(h, [relapse('a', NOW - 10 * DAY, 20 * DAY), relapse('b', NOW - 30 * DAY, 0)], NOW);
    const f = barFractions(hist.items);
    expect(f).toEqual([0.04, 1, 0.5]);
  });

  it('labels streaks compactly in days, with thousands separators', () => {
    expect(streakLabel(33 * DAY + 5 * HOUR)).toBe('33d');
    expect(streakLabel(1234 * DAY)).toBe('1,234d');
    expect(streakLabel(5 * HOUR)).toBe('5h');
    expect(streakLabel(12 * MINUTE)).toBe('12 min');
    expect(streakLabel(0)).toBe('0 min');
  });

  it('never uses "m" for minutes (milestone badges use "1m" for a month)', () => {
    expect(streakLabel(5 * MINUTE)).not.toMatch(/^\d+m$/);
  });
});

describe('rangeLabel', () => {
  const now = new Date(2026, 9, 9, 12).getTime();
  it('omits the year inside the current year', () => {
    expect(rangeLabel(new Date(2026, 6, 12).getTime(), new Date(2026, 7, 14).getTime(), false, now)).toBe('12 Jul → 14 Aug');
  });
  it('keeps years across years and says now for the current streak', () => {
    expect(rangeLabel(new Date(2025, 11, 28).getTime(), new Date(2026, 0, 3).getTime(), false, now)).toBe('28 Dec 2025 → 3 Jan');
    expect(rangeLabel(new Date(2026, 8, 12).getTime(), now, true, now)).toBe('12 Sep → now');
  });
});

describe('arc helpers', () => {
  it('mixes colors', () => {
    expect(mixHex('#FFFFFF', '#000000', 0)).toBe('#ffffff');
    expect(mixHex('#FFFFFF', '#000000', 1)).toBe('#000000');
    expect(mixHex('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(mixHex('#FFF', '#B45309', 2)).toBe('#b45309');
  });

  it('places angles clockwise from 12 o\'clock', () => {
    const top = polar(50, 50, 40, 0);
    const right = polar(50, 50, 40, 90);
    const bottom = polar(50, 50, 40, 180);
    expect(top.x).toBeCloseTo(50);
    expect(top.y).toBeCloseTo(10);
    expect(right.x).toBeCloseTo(90);
    expect(right.y).toBeCloseTo(50);
    expect(bottom.y).toBeCloseTo(90);
  });

  it('splits an arc into blended segments', () => {
    expect(arcSegments(50, 50, 40, 0, '#FFFFFF', '#000000')).toEqual([]);
    // 180° arc: blend over the first 60% (108°) in 1.5° steps, then one solid segment.
    const half = arcSegments(50, 50, 40, 0.5, '#FFFFFF', '#000000');
    expect(half).toHaveLength(73);
    expect(half[0].d.startsWith('M 50.00 10.00 A 40 40 0 0 1')).toBe(true);
    expect(half[half.length - 1].d.endsWith('50.00 90.00')).toBe(true);
    expect(half[0].color).not.toBe('#000000');
    expect(half[half.length - 1].color).toBe('#000000');
    // Full circle: the blend is capped at 110°, the solid rest uses the large-arc flag.
    const full = arcSegments(50, 50, 40, 1, '#FFFFFF', '#000000');
    const solid = full[full.length - 1].d;
    expect(solid).toContain(' 0 1 1 ');
    expect(full.length).toBeLessThan(80);
  });

  it('keeps tiny arcs drawable', () => {
    const tiny = arcSegments(50, 50, 40, 0.001, '#FFFFFF', '#000000');
    expect(tiny.length).toBeGreaterThanOrEqual(1);
  });
});

describe('arcPath', () => {
  it('draws nothing for an empty arc', () => {
    expect(arcPath(50, 50, 40, 0)).toBe('');
  });
  it('uses one arc up to half a circle and two beyond', () => {
    expect(arcPath(50, 50, 40, 90)).toBe('M 50.00 10.00 A 40 40 0 0 1 90.00 50.00');
    const big = arcPath(50, 50, 40, 270);
    expect(big.match(/A /g)).toHaveLength(2);
    expect(big.endsWith('10.00 50.00')).toBe(true);
  });
});

describe('dateTimeLabel', () => {
  const now = new Date(2026, 9, 9, 12).getTime();
  it('drops the year inside the current year', () => {
    expect(dateTimeLabel(new Date(2026, 8, 10, 16, 49).getTime(), now)).toBe('10 Sep, 16:49');
    expect(dateTimeLabel(new Date(2025, 11, 28, 9, 0).getTime(), now)).toBe('28 Dec 2025, 09:00');
  });
});

describe('relativeDateTimeLabel', () => {
  const now = new Date(2026, 9, 9, 22).getTime();
  it('says Today / Yesterday for recent times', () => {
    expect(relativeDateTimeLabel(new Date(2026, 9, 9, 21, 9).getTime(), now)).toBe('Today, 21:09');
    expect(relativeDateTimeLabel(new Date(2026, 9, 8, 8, 5).getTime(), now)).toBe('Yesterday, 08:05');
  });
  it('falls back to the date for older times', () => {
    expect(relativeDateTimeLabel(new Date(2026, 9, 7, 16, 49).getTime(), now)).toBe('7 Oct, 16:49');
    expect(relativeDateTimeLabel(new Date(2025, 11, 28, 9, 0).getTime(), now)).toBe('28 Dec 2025, 09:00');
  });
});

describe('badgeDate', () => {
  const now = new Date(2026, 9, 9, 12).getTime();
  it('shows day and month this year, month and year otherwise', () => {
    expect(badgeDate(new Date(2026, 4, 23).getTime(), now)).toBe('23 May');
    expect(badgeDate(new Date(2024, 4, 23).getTime(), now)).toBe('May 2024');
    expect(badgeDate(new Date(2027, 0, 2).getTime(), now)).toBe('Jan 2027');
  });
});
