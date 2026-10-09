import { DAY, HOUR, MINUTE } from '@/domain/time';
import type { Habit } from '@/types';
import {
  areaPath,
  distinctFrom,
  evenTicks,
  hueOf,
  labelIndices,
  linearScale,
  linePath,
  monotonePath,
  pointsAttr,
  polar,
  revealOffset,
  roundedTopBar,
  similarHue,
  wedgePath,
} from '../charts/geometry';
import {
  abbreviate,
  ambiguousCurrencies,
  axisCompact,
  cardValueFontSize,
  compactNumber,
  currencyMark,
  currencyTag,
  daysHours,
  durationParts,
  habitAbbreviations,
  hoursTick,
  hourLabel,
  hoursLabel,
  hoursValue,
  moneySuffix,
  roundPercent,
  shortDays,
  spanLabel,
} from '../format';
import { initialScope, parseHabitId, parseTab, pickableHabits, selectHabit } from '../scope';

describe('geometry', () => {
  it('swaps a color that reads like a reserved one', () => {
    expect(distinctFrom('#EAB308', '#EAB308', '#FFFFFF', 15)).toBe('#FFFFFF');
    expect(distinctFrom('#F59E0B', '#EAB308', '#FFFFFF', 15)).toBe('#FFFFFF');
    expect(distinctFrom('#F97316', '#EAB308', '#FFFFFF', 15)).toBe('#F97316');
    expect(distinctFrom('#3B82F6', '#EAB308', '#FFFFFF', 15)).toBe('#3B82F6');
  });

  it('scales linearly and handles empty domains', () => {
    const s = linearScale(0, 10, 100, 0);
    expect(s(0)).toBe(100);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(0);
    expect(linearScale(3, 3, 7, 9)(42)).toBe(7);
  });

  it('builds line and area paths', () => {
    const pts = [
      { x: 0, y: 10 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ];
    expect(linePath([])).toBe('');
    expect(linePath(pts)).toBe('M0 10 L5 5 L10 0');
    expect(areaPath('M0 10', pts, 20)).toBe('M0 10 L10 20 L0 20 Z');
  });

  it('builds a monotone curve through every point', () => {
    const pts = [
      { x: 0, y: 100 },
      { x: 10, y: 90 },
      { x: 20, y: 90 },
      { x: 30, y: 10 },
    ];
    const d = monotonePath(pts);
    expect(d.startsWith('M0 100')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(3);
    expect(d.endsWith('30 10')).toBe(true);
    // the flat segment keeps flat control points (no overshoot below y = 90)
    expect(d).toContain('C13.33 90 16.67 90 20 90');
    expect(monotonePath(pts.slice(0, 2))).toBe('M0 100 L10 90');
  });

  it('computes polar points clockwise from 12 o’clock', () => {
    const top = polar(50, 50, 10, 0, 4);
    expect(top.x).toBeCloseTo(50);
    expect(top.y).toBeCloseTo(40);
    const right = polar(50, 50, 10, 1, 4);
    expect(right.x).toBeCloseTo(60);
    expect(right.y).toBeCloseTo(50);
    expect(wedgePath(50, 50, 0, 0, 4)).toBe('');
    expect(wedgePath(50, 50, 10, 0, 4)).toBe('M50 50 L50 40 A10 10 0 0 1 60 50 Z');
    expect(pointsAttr([top, right])).toBe('50,40 60,50');
  });

  it('draws bars with rounded tops', () => {
    expect(roundedTopBar(0, 0, 0, 10, 4)).toBe('');
    expect(roundedTopBar(0, 0, 10, 0, 4)).toBe('');
    const d = roundedTopBar(0, 10, 10, 20, 4);
    expect(d.startsWith('M0 30 L0 14 Q0 10 4 10')).toBe(true);
    // radius clamps to half the width
    expect(roundedTopBar(0, 0, 4, 20, 10)).toContain('Q0 0 2 0');
  });

  it('scrolls items into view only when needed', () => {
    // visible → no scroll
    expect(revealOffset(100, 80, 0, 358, 16)).toBeNull();
    // off to the right → scroll so its right edge + inset + peek fits
    expect(revealOffset(400, 90, 0, 358, 16)).toBe(400 + 90 + 44 - 358);
    // off to the left → scroll back, never below 0
    expect(revealOffset(20, 90, 200, 358, 16)).toBe(0);
    expect(revealOffset(150, 90, 200, 358, 16)).toBe(106);
  });

  it('compares hues', () => {
    expect(hueOf('#EF4444')).toBeCloseTo(0);
    expect(hueOf('#3B82F6')).toBeCloseTo(217, 0);
    expect(hueOf('#808080')).toBeNull();
    expect(hueOf('nope')).toBeNull();
    // red habit vs danger red, rose wraps around 360°
    expect(similarHue('#EF4444', '#EF4444', 20)).toBe(true);
    expect(similarHue('#F43F5E', '#EF4444', 20)).toBe(true);
    expect(similarHue('#F97316', '#EF4444', 20)).toBe(false);
    expect(similarHue('#22C55E', '#EF4444', 20)).toBe(false);
    expect(similarHue('#808080', '#EF4444', 20)).toBe(false);
  });

  it('makes ticks and label indices', () => {
    expect(evenTicks(8, 4)).toEqual([0, 2, 4, 6, 8]);
    expect(labelIndices(0, 5)).toEqual([]);
    expect(labelIndices(4, 6)).toEqual([0, 1, 2, 3]);
    const idx = labelIndices(24, 6);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(23);
    expect(idx.length).toBeLessThanOrEqual(6);
    // never two labels on neighbouring bars at the end
    const tight = labelIndices(14, 9);
    expect(tight[tight.length - 1] - tight[tight.length - 2]).toBeGreaterThan(1);
  });
});

describe('format', () => {
  const NBSP = '\u00A0';

  it('formats money with a suffix symbol', () => {
    expect(moneySuffix(4600, 'UAH')).toBe('4.6K₴');
    expect(moneySuffix(127.4, 'USD')).toBe('127$');
    expect(moneySuffix(0, 'EUR')).toBe('0€');
  });

  it('spaces multi-letter symbols off the number with a no-break space', () => {
    expect(moneySuffix(36_500, 'MXN')).toBe(`36.5K${NBSP}MX$`);
    expect(moneySuffix(5000, 'CHF')).toBe(`5K${NBSP}CHF`);
    expect(moneySuffix(2700, 'BRL')).toBe(`2.7K${NBSP}R$`);
    expect(moneySuffix(12, 'PLN')).toBe(`12${NBSP}zł`);
    expect(moneySuffix(12, 'XYZ')).toBe(`12${NBSP}XYZ`);
    expect(moneySuffix(12_000, 'JPY', true)).toBe(`12K${NBSP}JPY`);
    expect(currencyMark('JPY')).toBe('¥');
    expect(currencyMark('JPY', true)).toBe('JPY');
  });

  it('rounds before picking the compact unit', () => {
    expect(compactNumber(4823)).toBe('4.8K');
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(12.25)).toBe('12.3');
    expect(compactNumber(99.96)).toBe('100');
    expect(compactNumber(999.4)).toBe('999');
    expect(compactNumber(999.6)).toBe('1K');
    expect(compactNumber(999_940)).toBe('999.9K');
    expect(compactNumber(999_990)).toBe('1M');
    expect(compactNumber(1_250_000)).toBe('1.3M');
    expect(compactNumber(-4823)).toBe('-4.8K');
    expect(moneySuffix(999_990, 'MXN')).toBe(`1M${NBSP}MX$`);
    expect(axisCompact(999_990)).toBe('1m');
  });

  it('tells currencies that share a symbol apart', () => {
    const amb = ambiguousCurrencies(['JPY', 'USD', 'CNY', 'SEK', 'NOK', 'USD', 'EUR']);
    expect([...amb].sort()).toEqual(['CNY', 'JPY', 'NOK', 'SEK']);
    expect(ambiguousCurrencies(['JPY', 'JPY', 'USD']).size).toBe(0);
    expect(currencyTag('JPY')).toBe('¥');
    expect(currencyTag('JPY', true)).toBe('¥ JPY');
    expect(currencyTag('XYZ', true)).toBe('XYZ');
  });

  it('picks a card font size that fits value and suffix', () => {
    expect(cardValueFontSize('4.6K', '₴')).toBe(24);
    expect(cardValueFontSize('40K', 'MX$')).toBe(24);
    expect(cardValueFontSize('547.5K', 'CHF')).toBe(20);
    expect(cardValueFontSize('1,825', 'h')).toBe(24);
    expect(cardValueFontSize('999.9K', 'ABCD')).toBe(17);
  });

  it('formats axis labels', () => {
    expect(axisCompact(0)).toBe('0');
    expect(axisCompact(6600)).toBe('6.6k');
    expect(axisCompact(1_250_000)).toBe('1.3m');
    expect(hoursLabel(0)).toBe('0h');
    expect(hoursLabel(252)).toBe('4.2h');
    expect(hoursLabel(243 * 60)).toBe('243h');
    expect(hoursLabel(2099 * 60)).toBe('2,099h');
  });

  it('formats hours saved the same way everywhere', () => {
    expect(hoursValue(0)).toBe('0');
    expect(hoursValue(1)).toBe('0');
    expect(hoursValue(60)).toBe('1');
    expect(hoursValue(252)).toBe('4.2');
    expect(hoursValue(243.4 * 60)).toBe('243');
    expect(hoursValue(2099 * 60)).toBe('2,099');
    expect(hoursValue(12_345 * 60)).toBe('12.3K');
    expect(hoursValue(-5)).toBe('0');
  });

  it('abbreviates names by code point, skipping emoji and punctuation', () => {
    expect(abbreviate('Smoking')).toBe('SMO');
    expect(abbreviate('🍫🍬 Chocolate')).toBe('CHO');
    expect(abbreviate('Social media')).toBe('SOC');
    expect(abbreviate('TV')).toBe('TV');
    expect(abbreviate('Кава')).toBe('КАВ');
    expect(abbreviate('咖啡因')).toBe('咖啡因');
    expect(abbreviate('🍫🍬')).toBe('🍫');
    expect(abbreviate('  ')).toBe('?');
    expect(abbreviate('Gambling', 4)).toBe('GAMB');
  });

  it('gives look-alike habits distinct abbreviations', () => {
    const m = habitAbbreviations([
      { id: 'a', name: 'Gaming' },
      { id: 'b', name: 'Gambling' },
      { id: 'c', name: 'Smoking' },
      { id: 'd', name: 'Sugar' },
      { id: 'e', name: 'Sugar' },
    ]);
    expect(m.get('a')).toBe('GAMI');
    expect(m.get('b')).toBe('GAMB');
    expect(m.get('c')).toBe('SMO');
    expect(m.get('d')).toBe('SUG1');
    expect(m.get('e')).toBe('SUG2');
    expect(new Set(m.values()).size).toBe(5);
  });

  it('splits durations for big numbers', () => {
    expect(durationParts(29 * DAY + 3 * HOUR)).toEqual({ value: '29', unit: 'days' });
    expect(durationParts(DAY)).toEqual({ value: '1', unit: 'day' });
    expect(durationParts(5 * HOUR)).toEqual({ value: '5', unit: 'hours' });
    expect(durationParts(12 * MINUTE)).toEqual({ value: '12', unit: 'min' });
    expect(durationParts(-1)).toEqual({ value: '0', unit: 'min' });
  });

  it('labels spans and short days', () => {
    expect(spanLabel(30 * MINUTE)).toBe('30m');
    expect(spanLabel(20 * HOUR)).toBe('20h');
    expect(spanLabel(5 * DAY)).toBe('5d');
    expect(spanLabel(15 * DAY)).toBe('2w');
    expect(spanLabel(37 * DAY)).toBe('5w');
    expect(spanLabel(120 * DAY)).toBe('4mo');
    expect(spanLabel(800 * DAY)).toBe('2y');
    expect(shortDays(0.4 * DAY)).toBe('9h');
    expect(shortDays(12.7 * DAY)).toBe('12d');
    expect(shortDays(10 * MINUTE)).toBe('10m');
  });

  it('formats hour ticks consistently per axis', () => {
    expect(hoursTick(0, 300)).toBe('0.0h');
    expect(hoursTick(78, 300)).toBe('1.3h');
    expect(hoursTick(0, 75 * 60)).toBe('0h');
    expect(hoursTick(56.25 * 60, 75 * 60)).toBe('56h');
    expect(hoursTick(2099 * 60, 2099 * 60)).toBe('2,099h');
  });

  it('formats day-based durations', () => {
    expect(daysHours(33 * DAY)).toBe('33d');
    expect(daysHours(29 * DAY + 3 * HOUR + 17 * MINUTE)).toBe('29d 3h');
    expect(daysHours(20 * HOUR + 43 * MINUTE)).toBe('20h 43m');
    expect(daysHours(-5)).toBe('<1m');
  });

  it('formats percent and hours', () => {
    expect(roundPercent(0.4)).toBe('40%');
    expect(roundPercent(1 / 3)).toBe('33%');
    expect(roundPercent(2)).toBe('100%');
    expect(hourLabel(7)).toBe('07:00');
    expect(hourLabel(24)).toBe('00:00');
  });
});

describe('scope', () => {
  const h = (id: string, archived = false) => ({ id, archived }) as Habit;

  it('parses params', () => {
    expect(parseTab(undefined)).toBe('streaks');
    expect(parseTab('Savings')).toBe('savings');
    expect(parseTab(['mood'])).toBe('mood');
    expect(parseTab('pricing')).toBe('streaks');
    expect(parseHabitId('  ')).toBeUndefined();
    expect(parseHabitId('demo_smoking')).toBe('demo_smoking');
    expect(initialScope(undefined)).toBe('all');
    expect(initialScope('x')).toBe('habit');
    expect(initialScope('x', true)).toBe('habit');
    expect(initialScope('deleted', false)).toBe('all');
  });

  it('offers archived habits only when requested and falls back on missing ids', () => {
    const active = [h('a'), h('b')];
    const all = [...active, h('z', true)];
    expect(pickableHabits(active, all, undefined).map((x) => x.id)).toEqual(['a', 'b']);
    expect(pickableHabits(active, all, 'z').map((x) => x.id)).toEqual(['a', 'b', 'z']);
    expect(pickableHabits(active, all, 'gone').map((x) => x.id)).toEqual(['a', 'b']);
    expect(selectHabit(active, 'b')?.id).toBe('b');
    expect(selectHabit(active, 'gone')?.id).toBe('a');
    expect(selectHabit([], 'gone')).toBeUndefined();
  });
});
