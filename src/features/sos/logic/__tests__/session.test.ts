import { EXERCISES } from '@/domain/catalog/exercises';
import { DAY, HOUR, MINUTE } from '@/domain/time';
import type { Habit } from '@/types';
import {
  buildSession,
  clampIntensity,
  completionTitle,
  freeForLabel,
  intensityDeltaMessage,
  intensityLabel,
  intensityLevel,
  intensityLevelLabel,
  intensityParam,
  isExerciseId,
  nextExerciseId,
  parseExerciseId,
  parseHabitId,
  parseIntensity,
  PICKER_ROUTE_NAME,
  pickerHref,
  previousRoute,
  previousRouteName,
  hasRoute,
  resolveContextHabit,
  runnerHref,
} from '../session';

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id,
  kind: 'smoking',
  name: 'Smoking',
  color: '#EF4444',
  icon: 'smoking',
  startedAt: 0,
  firstStartedAt: 0,
  createdAt: 0,
  dailyCost: 0,
  currency: 'USD',
  dailyMinutes: 0,
  goalDays: null,
  reason: '',
  archived: false,
  order: 0,
  ...over,
});

describe('route params', () => {
  it('parses intensity', () => {
    expect(parseIntensity('7')).toBe(7);
    expect(parseIntensity(['3', '9'])).toBe(3);
    expect(parseIntensity('10')).toBe(10);
    expect(parseIntensity('0')).toBeNull();
    expect(parseIntensity('11')).toBeNull();
    expect(parseIntensity('4.5')).toBeNull();
    expect(parseIntensity('abc')).toBeNull();
    expect(parseIntensity('')).toBeNull();
    expect(parseIntensity(undefined)).toBeNull();
  });

  it('validates exercise ids and habit ids', () => {
    expect(isExerciseId('box_breathing')).toBe(true);
    expect(isExerciseId(['cold_water'])).toBe(true);
    expect(isExerciseId('nope')).toBe(false);
    expect(isExerciseId(undefined)).toBe(false);
    expect(parseHabitId(' demo_smoking ')).toBe('demo_smoking');
    expect(parseHabitId('')).toBeNull();
    expect(parseHabitId(undefined)).toBeNull();
  });

  it('builds hrefs', () => {
    expect(runnerHref('box_breathing', null, null)).toBe('/sos/box_breathing');
    expect(runnerHref('wait_it_out', 'demo_smoking', 7)).toBe('/sos/wait_it_out?habitId=demo_smoking&before=7');
    expect(runnerHref('cold_water', null, 2)).toBe('/sos/cold_water?before=2');
    expect(pickerHref(null)).toBe('/sos');
    expect(pickerHref('h 1')).toBe('/sos?habitId=h%201');
    expect(pickerHref('demo_smoking', 3)).toBe('/sos?habitId=demo_smoking&before=3');
    expect(pickerHref(null, 10)).toBe('/sos?before=10');
    expect(pickerHref('demo_smoking', 4, 'box_breathing')).toBe('/sos?habitId=demo_smoking&before=4&last=box_breathing');
    expect(pickerHref(null, null, 'cold_water')).toBe('/sos?last=cold_water');
    expect(intensityParam(4)).toBe('4');
    expect(intensityParam(null)).toBeUndefined();
  });
});

describe('exercise to suggest', () => {
  it('parses the exercise just done', () => {
    expect(parseExerciseId('body_scan')).toBe('body_scan');
    expect(parseExerciseId(['meditation_1min'])).toBe('meditation_1min');
    expect(parseExerciseId('nope')).toBeNull();
    expect(parseExerciseId(undefined)).toBeNull();
  });

  it('suggests the first exercise by default and a different one after a run', () => {
    expect(nextExerciseId(null)).toBe(EXERCISES[0].id);
    for (const e of EXERCISES) expect(nextExerciseId(e.id)).not.toBe(e.id);
    expect(nextExerciseId(EXERCISES[0].id)).toBe(EXERCISES[1].id);
    expect(nextExerciseId(EXERCISES[EXERCISES.length - 1].id)).toBe(EXERCISES[0].id);
  });
});

describe('resolveContextHabit', () => {
  const a = habit('a');
  const b = habit('b');
  const archived = habit('c', { archived: true });

  it('prefers the habit from the URL', () => {
    expect(resolveContextHabit([a, b], 'b')).toBe(b);
    expect(resolveContextHabit([a, archived], 'c')).toBe(archived);
  });

  it('falls back to the only active habit', () => {
    expect(resolveContextHabit([a, archived], null)).toBe(a);
    expect(resolveContextHabit([a, archived], 'deleted')).toBe(a);
    expect(resolveContextHabit([a, b], null)).toBeNull();
    expect(resolveContextHabit([a, b], 'deleted')).toBeNull();
    expect(resolveContextHabit([], null)).toBeNull();
  });
});

describe('labels', () => {
  it('describes the clean streak', () => {
    expect(freeForLabel(29 * DAY + 3 * HOUR)).toBe('29 days');
    expect(freeForLabel(DAY)).toBe('1 day');
    expect(freeForLabel(5 * HOUR)).toBe('5 hours');
    expect(freeForLabel(HOUR)).toBe('1 hour');
    expect(freeForLabel(12 * MINUTE)).toBe('12 minutes');
    expect(freeForLabel(30_000)).toBe('a few moments');
    expect(freeForLabel(-5)).toBe('a few moments');
  });

  it('labels intensity', () => {
    expect(intensityLevel(1)).toBe('mild');
    expect(intensityLevel(3)).toBe('mild');
    expect(intensityLevel(4)).toBe('moderate');
    expect(intensityLevel(7)).toBe('strong');
    expect(intensityLevel(10)).toBe('intense');
    expect(intensityLabel(null)).toBe('Not set');
    expect(intensityLabel(9)).toBe('9 · Overwhelming');
    expect(intensityLevelLabel(5)).toBe('Moderate');
  });

  it('gives feedback on the change in intensity', () => {
    expect(intensityDeltaMessage(8, null)).toBeNull();
    expect(intensityDeltaMessage(8, 3)).toBe('Down 5 points — the wave is passing.');
    expect(intensityDeltaMessage(5, 4)).toBe('Down 1 point. Every bit counts.');
    expect(intensityDeltaMessage(5, 5)).toMatch(/same/);
    expect(intensityDeltaMessage(3, 6)).toMatch(/Stronger/);
    expect(intensityDeltaMessage(null, 2)).toMatch(/quiet/);
    expect(intensityDeltaMessage(null, 5)).toMatch(/easing/);
    expect(intensityDeltaMessage(null, 9)).toMatch(/Still strong/);
    expect(completionTitle(true)).toBe('You outlasted it');
    expect(completionTitle(false)).toBe('Well done');
  });
});

describe('buildSession', () => {
  it('clamps stored values', () => {
    const s = buildSession({
      exerciseId: 'body_scan',
      durationSec: 179.6,
      completed: true,
      habitId: 'a',
      intensityBefore: 12,
      intensityAfter: 0,
      at: 123,
    });
    expect(s).toEqual({ exerciseId: 'body_scan', durationSec: 180, completed: true, habitId: 'a', intensityBefore: 10, intensityAfter: 1, at: 123 });
    expect(buildSession({ ...s, durationSec: -4, intensityBefore: null, intensityAfter: null })).toMatchObject({
      durationSec: 0,
      intensityBefore: null,
      intensityAfter: null,
    });
  });
});

describe('clampIntensity', () => {
  it('stores whole numbers 1–10', () => {
    expect(clampIntensity(null)).toBeNull();
    expect(clampIntensity(0)).toBe(1);
    expect(clampIntensity(7.4)).toBe(7);
    expect(clampIntensity(14)).toBe(10);
  });
});

describe('previousRouteName', () => {
  it('reads the route under the focused one', () => {
    expect(previousRouteName({ index: 2, routes: [{ name: 'index' }, { name: 'sos/index' }, { name: 'sos/[exercise]' }] })).toBe('sos/index');
    expect(previousRouteName({ routes: [{ name: 'index' }, { name: 'sos/[exercise]' }] })).toBe('index');
    expect(previousRouteName({ index: 0, routes: [{ name: 'sos/[exercise]' }] })).toBeNull();
    expect(previousRouteName(undefined)).toBeNull();
    expect(PICKER_ROUTE_NAME).toBe('sos/index');
  });

  it('finds the route below and checks membership by key', () => {
    const state = { index: 1, routes: [{ name: 'sos/index', key: 'p1' }, { name: 'sos/[exercise]', key: 'r1' }] };
    expect(previousRoute(state)).toEqual({ name: 'sos/index', key: 'p1' });
    expect(previousRoute({ index: 0, routes: state.routes })).toBeNull();
    expect(hasRoute(state, 'r1')).toBe(true);
    expect(hasRoute({ index: 0, routes: [state.routes[0]] }, 'r1')).toBe(false);
    expect(hasRoute(undefined, 'r1')).toBe(false);
  });
});
