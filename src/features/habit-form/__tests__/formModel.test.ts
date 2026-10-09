import { presetFor } from '@/domain/catalog/habits';
import { DAY, MINUTE } from '@/domain/time';
import type { Habit } from '@/types';
import {
  applyPreset,
  changeCurrency,
  firstErrorField,
  isFormDirty,
  numberToInput,
  parseDecimal,
  parseWholeNumber,
  previewChips,
  previewStats,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  streakHistory,
  validateHabitForm,
  valuesFromHabit,
  valuesFromPreset,
  yearlyAmount,
  yearlyHours,
  type HabitFormValues,
} from '../formModel';

const NOW = new Date(2026, 2, 29, 14, 43).getTime();

function base(overrides: Partial<HabitFormValues> = {}): HabitFormValues {
  return { ...valuesFromPreset(presetFor('smoking'), 'USD', NOW - 29 * DAY), ...overrides };
}

describe('parseDecimal', () => {
  it.each([
    ['', 0],
    ['10', 10],
    ['4.5', 4.5],
    ['4,50', 4.5],
    ['0,99', 0.99],
    ['.5', 0.5],
    ['12.', 12],
    ['1 200', 1200],
    ['1,200', 1200],
    ['1,200.50', 1200.5],
    ['1.200,50', 1200.5],
    ['1,000,000', 1000000],
    // A leading zero can't start a thousands group: comma-decimal locales.
    ['0,250', 0.25],
    ['0,500', 0.5],
    ['0.250', 0.25],
  ])('parses %p as %p', (input, expected) => {
    expect(parseDecimal(input)).toBeCloseTo(expected);
  });

  it.each(['abc', '-1', '1.2.3,4,5', '4,5,']) ('rejects %p', (input) => {
    expect(parseDecimal(input)).toBeNaN();
  });
});

describe('parseWholeNumber', () => {
  it('parses integers and treats empty as 0', () => {
    expect(parseWholeNumber('')).toBe(0);
    expect(parseWholeNumber(' 30 ')).toBe(30);
    expect(parseWholeNumber('30.5')).toBeNaN();
    expect(parseWholeNumber('-3')).toBeNaN();
  });
});

describe('input helpers', () => {
  it('sanitizes while typing', () => {
    expect(sanitizeDecimalInput('$4,5a0')).toBe('4,50');
    expect(sanitizeIntegerInput('1a2-3')).toBe('123');
    expect(sanitizeIntegerInput('123456789', 4)).toBe('1234');
  });

  it('turns numbers into editable text', () => {
    expect(numberToInput(10)).toBe('10');
    expect(numberToInput(4.5)).toBe('4.5');
    expect(numberToInput(4.055)).toBe('4.06');
    expect(numberToInput(0)).toBe('');
  });
});

describe('presets', () => {
  it('prefills from the preset in the chosen currency', () => {
    const v = valuesFromPreset(presetFor('smoking'), 'USD', NOW);
    expect(v).toMatchObject({ kind: 'smoking', name: 'Smoking', cost: '10', minutes: '60', goal: '', currency: 'USD' });
    expect(valuesFromPreset(presetFor('smoking'), 'UAH', NOW).cost).toBe('410');
    expect(valuesFromPreset(presetFor('custom'), 'USD', NOW)).toMatchObject({ name: '', cost: '', minutes: '' });
  });

  it('keeps fields the user edited when switching presets', () => {
    const v = base({ name: 'Cigarettes', cost: '7' });
    const next = applyPreset(v, { name: true, cost: true }, presetFor('alcohol'));
    expect(next).toMatchObject({ kind: 'alcohol', name: 'Cigarettes', cost: '7', minutes: '120', icon: 'glass-wine' });
    expect(next.color).toBe(presetFor('alcohol').color);
  });

  it('refills everything untouched', () => {
    const next = applyPreset(base(), {}, presetFor('caffeine'));
    expect(next).toMatchObject({ kind: 'caffeine', name: 'Coffee', cost: '4', minutes: '15' });
  });

  it('re-expresses an untouched preset cost when the currency changes', () => {
    const v = base();
    expect(changeCurrency(v, {}, 'EUR', presetFor('smoking'))).toMatchObject({ currency: 'EUR', cost: '9' });
    expect(changeCurrency(v, { cost: true }, 'EUR', presetFor('smoking'))).toMatchObject({ currency: 'EUR', cost: '10' });
  });

  it('builds values from an existing habit', () => {
    const habit: Habit = {
      id: 'h1',
      kind: 'alcohol',
      name: 'Wine',
      color: '#F59E0B',
      icon: 'glass-wine',
      startedAt: NOW - DAY,
      firstStartedAt: NOW - 10 * DAY,
      createdAt: NOW - 10 * DAY,
      dailyCost: 12.5,
      currency: 'EUR',
      dailyMinutes: 0,
      goalDays: 45,
      reason: 'Sleep',
      archived: false,
      order: 0,
    };
    expect(valuesFromHabit(habit)).toMatchObject({ name: 'Wine', cost: '12.5', minutes: '', goal: '45', currency: 'EUR', reason: 'Sleep' });
  });
});

describe('validateHabitForm', () => {
  it('parses a valid form', () => {
    const { errors, output } = validateHabitForm(base({ cost: '4,50', minutes: '30', goal: '45', reason: '  breathe  ' }), NOW);
    expect(errors).toEqual({});
    expect(output).toMatchObject({ name: 'Smoking', dailyCost: 4.5, dailyMinutes: 30, goalDays: 45, reason: 'breathe', currency: 'USD' });
  });

  it('treats empty numbers as not tracked and empty goal as auto', () => {
    const { output } = validateHabitForm(base({ cost: '', minutes: '', goal: '' }), NOW);
    expect(output).toMatchObject({ dailyCost: 0, dailyMinutes: 0, goalDays: null });
  });

  it('requires a name of at most 40 characters', () => {
    expect(validateHabitForm(base({ name: '   ' }), NOW).errors.name).toBeDefined();
    expect(validateHabitForm(base({ name: 'x'.repeat(41) }), NOW).errors.name).toBeDefined();
    expect(validateHabitForm(base({ name: 'x'.repeat(40) }), NOW).errors.name).toBeUndefined();
  });

  it('rejects future dates but tolerates a few seconds of drift', () => {
    expect(validateHabitForm(base({ startedAt: NOW + DAY }), NOW).errors.startedAt).toBeDefined();
    const ok = validateHabitForm(base({ startedAt: NOW + 5000 }), NOW);
    expect(ok.errors.startedAt).toBeUndefined();
    expect(ok.output?.startedAt).toBe(NOW);
  });

  it('respects the minimum start (last relapse)', () => {
    const { errors } = validateHabitForm(base({ startedAt: NOW - 5 * DAY }), NOW, { minStartedAt: NOW - 2 * DAY });
    expect(errors.startedAt).toBeDefined();
  });

  it('validates cost, minutes and goal', () => {
    const { errors, output } = validateHabitForm(base({ cost: 'abc', minutes: '1441', goal: '0' }), NOW);
    expect(output).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['cost', 'goal', 'minutes']);
    expect(validateHabitForm(base({ minutes: '1440' }), NOW).errors.minutes).toBeUndefined();
    expect(validateHabitForm(base({ minutes: '12.5' }), NOW).errors.minutes).toBeDefined();
    expect(validateHabitForm(base({ goal: '4000' }), NOW).errors.goal).toBeDefined();
  });

  it('reports the first error in form order', () => {
    expect(firstErrorField({ minutes: 'x', name: 'y' })).toBe('name');
    expect(firstErrorField({})).toBeUndefined();
  });
});

describe('preview helpers', () => {
  it('computes what the habit card will show', () => {
    const p = previewStats(base({ startedAt: NOW - 29 * DAY - 3 * MINUTE, cost: '10', minutes: '60' }), NOW);
    expect(p.days).toBe(29);
    expect(p.goalDays).toBe(30);
    expect(Math.floor(p.progress * 100)).toBe(96);
    expect(p.moneySaved).toBeCloseTo(290, 0);
    expect(p.minutesSaved).toBeCloseTo(1740, 0);
  });

  it('uses a valid custom goal and ignores invalid numbers', () => {
    const p = previewStats(base({ startedAt: NOW - 10 * DAY, goal: '45', cost: 'abc', minutes: '' }), NOW);
    expect(p.goalDays).toBe(45);
    expect(p.moneySaved).toBe(0);
    expect(p.minutesSaved).toBe(0);
  });

  it('counts savings over every clean streak, like the Home card', () => {
    const history = streakHistory([{ streakMs: 20 * DAY }, { streakMs: 40 * DAY }, { streakMs: -5 }]);
    expect(history).toEqual({ relapses: 3, priorCleanMs: 60 * DAY, bestPriorMs: 40 * DAY });
    const p = previewStats(base({ startedAt: NOW - 10 * DAY, cost: '10', minutes: '30' }), NOW, history);
    expect(p.totalCleanMs).toBe(70 * DAY);
    expect(p.moneySaved).toBeCloseTo(700);
    expect(p.minutesSaved).toBeCloseTo(2100);
    expect(p.attempt).toBe(4);
    expect(p.isRecord).toBe(false);
    expect(p.goalDays).toBe(14);
  });

  it('flags a record when the current streak is the longest', () => {
    expect(previewStats(base({ startedAt: NOW - 10 * DAY }), NOW).isRecord).toBe(true);
    expect(previewStats(base({ startedAt: NOW - 10 * DAY }), NOW, streakHistory([{ streakMs: 5 * DAY }])).isRecord).toBe(true);
    expect(previewStats(base({ startedAt: NOW }), NOW).isRecord).toBe(false);
  });

  it('shows the same chips as the Home card', () => {
    const history = streakHistory([{ streakMs: 40 * DAY }]);
    const money = previewChips(previewStats(base({ startedAt: NOW - 10 * DAY, cost: '10', minutes: '30' }), NOW, history), 'USD');
    expect(money.map((c) => c.kind)).toEqual(['money', 'attempt']);
    expect(money[0].label).toBe('$500.00');
    const timeOnly = previewChips(previewStats(base({ startedAt: NOW - 10 * DAY, cost: '', minutes: '30' }), NOW), 'USD');
    expect(timeOnly.map((c) => c.kind)).toEqual(['time', 'record']);
    const nothing = previewChips(previewStats(base({ startedAt: NOW - 10 * DAY, cost: '', minutes: '' }), NOW), 'USD');
    expect(nothing.map((c) => c.kind)).toEqual(['attempt', 'record']);
    const big = previewChips(previewStats(base({ startedAt: NOW - 200 * DAY, cost: '50' }), NOW), 'UAH');
    expect(big[0].label).toBe('₴10K');
  });

  it('shows the daily rate before a full clean day has accrued', () => {
    const chips = previewChips(previewStats(base({ startedAt: NOW - 5 * MINUTE, cost: '10', minutes: '30' }), NOW), 'USD');
    expect(chips[0]).toMatchObject({ kind: 'money', label: '$10.00/day' });
    const edited = previewChips(previewStats(base({ startedAt: NOW - 5 * MINUTE, cost: '10' }), NOW, streakHistory([{ streakMs: 3 * DAY }])), 'USD');
    expect(edited[0].label).toBe('$30.03');
  });

  it('detects unsaved changes', () => {
    const initial = base();
    expect(isFormDirty(initial, { ...initial })).toBe(false);
    expect(isFormDirty(initial, { ...initial, name: 'Vaping' })).toBe(true);
    expect(isFormDirty(initial, { ...initial, startedAt: initial.startedAt - MINUTE })).toBe(true);
  });

  it('projects yearly totals', () => {
    expect(yearlyAmount('10')).toBe(3650);
    expect(yearlyAmount('')).toBeNull();
    expect(yearlyHours('60')).toBe(365);
    expect(yearlyHours('abc')).toBeNull();
  });
});
