import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createMemoryRepository } from '@/data/memoryRepository';
import { settingsFromRows, type Repository } from '@/data/repository';
import type * as Dates from '@/domain/dates';
import {
  DEFAULT_SETTINGS,
  type AppSnapshot,
  type Behavior,
  type ColorLevel,
  type DayLog,
  type Settings,
} from '@/domain/types';
import { BEHAVIOR_MAX_LENGTH, useAppStore } from '@/state/store';

const TODAY = '2026-10-29';
const YESTERDAY = '2026-10-28';
const TOMORROW = '2026-10-30';

let mockToday = TODAY;
jest.mock('@/domain/dates', () => ({
  ...jest.requireActual<typeof Dates>('@/domain/dates'),
  todayLocal: () => mockToday,
}));

const GREEN: ColorLevel = 0;
const BLUE: ColorLevel = 1;
const YELLOW: ColorLevel = 2;
const RED: ColorLevel = 3;

const day = (date: string, color: ColorLevel | null, checkedIn = false): DayLog => ({
  date,
  color,
  checkedIn,
});

const behavior = (id: number, color: ColorLevel, text: string, sortOrder: number): Behavior => ({
  id,
  color,
  text,
  sortOrder,
});

function snapshot(partial: Partial<AppSnapshot> = {}): AppSnapshot {
  return {
    days: [],
    behaviors: [],
    settings: { ...DEFAULT_SETTINGS, reminder: { ...DEFAULT_SETTINGS.reminder } },
    ...partial,
  };
}

const initialState = useAppStore.getState();
const store = () => useAppStore.getState();

async function initWith(partial: Partial<AppSnapshot> = {}): Promise<Repository> {
  const repo = createMemoryRepository(snapshot(partial));
  await store().init(repo);
  return repo;
}

beforeEach(() => {
  mockToday = TODAY;
  useAppStore.setState(initialState, true);
});

describe('init', () => {
  it('starts not ready with defaults', () => {
    expect(store().ready).toBe(false);
    expect(store().days).toEqual({});
    expect(store().behaviors).toEqual([]);
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('loads the snapshot and sets ready', async () => {
    const partner = { name: 'Sam', phone: '+1 555 0100' };
    await initWith({
      days: [day(YESTERDAY, BLUE, true), day('2026-10-20', RED)],
      behaviors: [behavior(2, YELLOW, 'Late scrolling', 0), behavior(1, GREEN, 'Walk', 0)],
      settings: { ...DEFAULT_SETTINGS, partner, onboardingDone: true },
    });

    const s = store();
    expect(s.ready).toBe(true);
    expect(s.today).toBe(TODAY);
    expect(s.days).toEqual({
      [YESTERDAY]: day(YESTERDAY, BLUE, true),
      '2026-10-20': day('2026-10-20', RED),
    });
    expect(s.behaviors.map((b) => b.id)).toEqual([1, 2]);
    expect(s.settings.partner).toEqual(partner);
    expect(s.settings.onboardingDone).toBe(true);
  });

  it('drops empty days from the loaded snapshot', async () => {
    await initWith({ days: [day(YESTERDAY, null, false), day(TODAY, null, true)] });
    expect(Object.keys(store().days)).toEqual([TODAY]);
  });

  it('rejects writes before init', async () => {
    await expect(store().setColor(TODAY, GREEN)).rejects.toThrow('init');
    await expect(store().addBehavior(GREEN, 'Walk')).rejects.toThrow('init');
  });
});

describe('refreshToday', () => {
  it('recomputes today from the clock', async () => {
    await initWith();
    mockToday = TOMORROW;
    store().refreshToday();
    expect(store().today).toBe(TOMORROW);
  });
});

describe('setColor', () => {
  it('saves a first color and persists it', async () => {
    const repo = await initWith();
    const outcome = await store().setColor(TODAY, YELLOW);
    expect(outcome).toEqual({
      kind: 'saved',
      day: day(TODAY, YELLOW),
      becameRed: false,
    });
    expect(store().days[TODAY]).toEqual(day(TODAY, YELLOW));
    expect((await repo.loadAll()).days).toEqual([day(TODAY, YELLOW)]);
  });

  it('a worse color replaces a better one', async () => {
    const repo = await initWith({ days: [day(TODAY, GREEN)] });
    const outcome = await store().setColor(TODAY, RED);
    expect(outcome).toEqual({
      kind: 'saved',
      day: day(TODAY, RED),
      becameRed: true,
    });
    expect(store().days[TODAY].color).toBe(RED);
    expect((await repo.loadAll()).days).toEqual([day(TODAY, RED)]);
  });

  it('a better color needs confirmation and changes nothing until confirmed', async () => {
    const repo = await initWith({ days: [day(TODAY, YELLOW)] });

    const asked = await store().setColor(TODAY, GREEN);
    expect(asked).toEqual({ kind: 'needsConfirmBetter', current: YELLOW, requested: GREEN });
    expect(store().days[TODAY].color).toBe(YELLOW);
    expect((await repo.loadAll()).days).toEqual([day(TODAY, YELLOW)]);

    const confirmed = await store().setColor(TODAY, GREEN, { confirmBetter: true });
    expect(confirmed).toEqual({
      kind: 'saved',
      day: day(TODAY, GREEN),
      becameRed: false,
    });
    expect(store().days[TODAY].color).toBe(GREEN);
    expect((await repo.loadAll()).days).toEqual([day(TODAY, GREEN)]);
  });

  it('a confirmed better color keeps the check-in', async () => {
    await initWith({ days: [day(TODAY, YELLOW, true)] });
    await store().setColor(TODAY, BLUE, { confirmBetter: true });
    expect(store().days[TODAY]).toEqual(day(TODAY, BLUE, true));
  });

  it('a worse color after the call keeps the check-in (one call per day)', async () => {
    const repo = await initWith({ days: [day(TODAY, GREEN, true)] });
    const outcome = await store().setColor(TODAY, YELLOW);
    expect(outcome).toEqual({ kind: 'saved', day: day(TODAY, YELLOW, true), becameRed: false });
    expect(store().days[TODAY]).toEqual(day(TODAY, YELLOW, true));
    expect((await repo.loadAll()).days).toEqual([day(TODAY, YELLOW, true)]);
  });

  it('a worse color on a past checked-in day keeps that call', async () => {
    const repo = await initWith({ days: [day(YESTERDAY, GREEN, true)] });
    const outcome = await store().setColor(YESTERDAY, RED);
    expect(outcome).toEqual({ kind: 'saved', day: day(YESTERDAY, RED, true), becameRed: true });
    expect((await repo.loadAll()).days).toEqual([day(YESTERDAY, RED, true)]);
  });

  it('keeps the check-in when the previous color was null', async () => {
    const repo = await initWith({ days: [day(TODAY, null, true)] });
    const outcome = await store().setColor(TODAY, BLUE);
    expect(outcome).toEqual({
      kind: 'saved',
      day: day(TODAY, BLUE, true),
      becameRed: false,
    });
    expect((await repo.loadAll()).days).toEqual([day(TODAY, BLUE, true)]);
  });

  it('backfills a past day', async () => {
    await initWith();
    const outcome = await store().setColor('2026-10-01', BLUE);
    expect(outcome.kind).toBe('saved');
    expect(store().days['2026-10-01']).toEqual(day('2026-10-01', BLUE));
  });

  it('rejects future days without writing', async () => {
    const repo = await initWith();
    expect(await store().setColor(TOMORROW, GREEN)).toEqual({ kind: 'rejectedFuture' });
    expect(store().days).toEqual({});
    expect((await repo.loadAll()).days).toEqual([]);
  });

  it('decides against the real clock, not a stale today', async () => {
    await initWith();
    mockToday = TOMORROW; // midnight passed, refreshToday not called yet
    const outcome = await store().setColor(TOMORROW, GREEN);
    expect(outcome.kind).toBe('saved');
    expect(store().today).toBe(TOMORROW);
  });

  it('throws on a malformed date', async () => {
    await initWith();
    await expect(store().setColor('2026-13-01', GREEN)).rejects.toThrow(RangeError);
  });

  it('runs overlapping calls in order', async () => {
    await initWith();
    const [first, second] = await Promise.all([
      store().setColor(TODAY, RED),
      store().setColor(TODAY, GREEN),
    ]);
    expect(first.kind).toBe('saved');
    expect(second).toEqual({ kind: 'needsConfirmBetter', current: RED, requested: GREEN });
    expect(store().days[TODAY].color).toBe(RED);
  });

  it('leaves state unchanged when the repository write fails', async () => {
    const repo = createMemoryRepository(snapshot({ days: [day(TODAY, GREEN)] }));
    const failing: Repository = {
      ...repo,
      upsertDay: () => Promise.reject(new Error('disk full')),
    };
    await store().init(failing);
    await expect(store().setColor(TODAY, RED)).rejects.toThrow('disk full');
    expect(store().days[TODAY]).toEqual(day(TODAY, GREEN));
    // The queue keeps working after a failure.
    await store().init(repo);
    expect((await store().setColor(TODAY, RED)).kind).toBe('saved');
  });
});

describe('setCheckedIn', () => {
  it('creates a day with no color', async () => {
    const repo = await initWith();
    await store().setCheckedIn(TODAY, true);
    expect(store().days[TODAY]).toEqual(day(TODAY, null, true));
    expect((await repo.loadAll()).days).toEqual([day(TODAY, null, true)]);
  });

  it('marks an existing colored day', async () => {
    const repo = await initWith({ days: [day(YESTERDAY, YELLOW)] });
    await store().setCheckedIn(YESTERDAY, true);
    expect(store().days[YESTERDAY]).toEqual(day(YESTERDAY, YELLOW, true));
    expect((await repo.loadAll()).days).toEqual([day(YESTERDAY, YELLOW, true)]);
  });

  it('deletes the day when it is left with no color and no check-in', async () => {
    const repo = await initWith({ days: [day(TODAY, null, true)] });
    await store().setCheckedIn(TODAY, false);
    expect(store().days).toEqual({});
    expect((await repo.loadAll()).days).toEqual([]);
  });

  it('keeps a colored day when unchecking', async () => {
    const repo = await initWith({ days: [day(TODAY, BLUE, true)] });
    await store().setCheckedIn(TODAY, false);
    expect(store().days[TODAY]).toEqual(day(TODAY, BLUE, false));
    expect((await repo.loadAll()).days).toEqual([day(TODAY, BLUE, false)]);
  });

  it('unchecking an unlogged day stores nothing', async () => {
    const repo = await initWith();
    await store().setCheckedIn(YESTERDAY, false);
    expect(store().days).toEqual({});
    expect((await repo.loadAll()).days).toEqual([]);
  });

  it('ignores future days', async () => {
    const repo = await initWith();
    await store().setCheckedIn(TOMORROW, true);
    expect(store().days).toEqual({});
    expect((await repo.loadAll()).days).toEqual([]);
  });
});

describe('behaviors', () => {
  it('adds trimmed text at the end of its color and keeps the list sorted', async () => {
    const repo = await initWith();
    await store().addBehavior(YELLOW, '  Scrolling late  ');
    await store().addBehavior(GREEN, 'Morning walk');
    await store().addBehavior(YELLOW, 'Skipping sleep');

    const list = store().behaviors;
    expect(list.map((b) => [b.color, b.text, b.sortOrder])).toEqual([
      [GREEN, 'Morning walk', 0],
      [YELLOW, 'Scrolling late', 0],
      [YELLOW, 'Skipping sleep', 1],
    ]);
    expect(new Set(list.map((b) => b.id)).size).toBe(3);
    expect((await repo.loadAll()).behaviors).toEqual(list);
  });

  it('rejects empty and whitespace-only text', async () => {
    const repo = await initWith();
    await store().addBehavior(GREEN, '');
    await store().addBehavior(GREEN, '   \n\t ');
    expect(store().behaviors).toEqual([]);
    expect((await repo.loadAll()).behaviors).toEqual([]);
  });

  it('cuts text to the maximum length without splitting an emoji', async () => {
    await initWith();
    await store().addBehavior(BLUE, 'a'.repeat(BEHAVIOR_MAX_LENGTH + 30));
    expect(store().behaviors[0].text).toBe('a'.repeat(BEHAVIOR_MAX_LENGTH));

    await store().addBehavior(BLUE, 'b'.repeat(BEHAVIOR_MAX_LENGTH - 1) + '\u{1F600}tail');
    expect(store().behaviors[1].text).toBe('b'.repeat(BEHAVIOR_MAX_LENGTH - 1));
  });

  it('updates text (trimmed) and persists it', async () => {
    const repo = await initWith({ behaviors: [behavior(5, GREEN, 'Walk', 0)] });
    await store().updateBehavior(5, '  Evening walk ');
    expect(store().behaviors).toEqual([behavior(5, GREEN, 'Evening walk', 0)]);
    expect((await repo.loadAll()).behaviors).toEqual([behavior(5, GREEN, 'Evening walk', 0)]);
  });

  it('ignores an update to empty text or an unknown id', async () => {
    const repo = await initWith({ behaviors: [behavior(5, GREEN, 'Walk', 0)] });
    await store().updateBehavior(5, '   ');
    await store().updateBehavior(99, 'Ghost');
    expect(store().behaviors).toEqual([behavior(5, GREEN, 'Walk', 0)]);
    expect((await repo.loadAll()).behaviors).toEqual([behavior(5, GREEN, 'Walk', 0)]);
  });

  it('removes a behavior', async () => {
    const repo = await initWith({
      behaviors: [behavior(1, GREEN, 'Walk', 0), behavior(2, GREEN, 'Call a friend', 1)],
    });
    await store().removeBehavior(1);
    expect(store().behaviors).toEqual([behavior(2, GREEN, 'Call a friend', 1)]);
    expect((await repo.loadAll()).behaviors).toEqual([behavior(2, GREEN, 'Call a friend', 1)]);
  });

  it('never reuses a removed id', async () => {
    await initWith({ behaviors: [behavior(7, RED, 'Old line', 0)] });
    await store().removeBehavior(7);
    await store().addBehavior(RED, 'New line');
    expect(store().behaviors[0].id).toBeGreaterThan(7);
  });
});

describe('settings', () => {
  it('setPartner saves a trimmed partner and can remove it', async () => {
    const repo = await initWith();
    await store().setPartner({ name: ' Sam ', phone: ' +1 555 0100 ' });
    expect(store().settings.partner).toEqual({ name: 'Sam', phone: '+1 555 0100' });
    expect((await repo.loadAll()).settings.partner).toEqual({ name: 'Sam', phone: '+1 555 0100' });

    await store().setPartner(null);
    expect(store().settings.partner).toBeNull();
    expect((await repo.loadAll()).settings.partner).toBeNull();
  });

  it('setReminder persists and validates the time', async () => {
    const repo = await initWith();
    await store().setReminder({ enabled: true, hour: 7, minute: 30 });
    expect(store().settings.reminder).toEqual({ enabled: true, hour: 7, minute: 30 });
    expect((await repo.loadAll()).settings.reminder).toEqual({ enabled: true, hour: 7, minute: 30 });

    await expect(store().setReminder({ enabled: true, hour: 24, minute: 0 })).rejects.toThrow(RangeError);
    await expect(store().setReminder({ enabled: true, hour: 8, minute: 1.5 })).rejects.toThrow(RangeError);
    expect(store().settings.reminder).toEqual({ enabled: true, hour: 7, minute: 30 });
  });

  it('markExported stores a valid ISO instant only', async () => {
    const repo = await initWith();
    const iso = '2026-10-29T18:30:00.000Z';
    await store().markExported(iso);
    expect(store().settings.lastExportAt).toBe(iso);
    expect((await repo.loadAll()).settings.lastExportAt).toBe(iso);

    await expect(store().markExported('yesterday')).rejects.toThrow(RangeError);
    expect(store().settings.lastExportAt).toBe(iso);
  });
});

describe('setLastRedDay', () => {
  it('saves the last Red day as a Red day in the log', async () => {
    const repo = await initWith();
    await store().setLastRedDay('2026-09-01');
    expect(store().days).toEqual({ '2026-09-01': day('2026-09-01', RED) });
    expect((await repo.loadAll()).days).toEqual([day('2026-09-01', RED)]);
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('replaces the one saved before, or just removes it for "Start counting today"', async () => {
    const repo = await initWith();
    await store().setLastRedDay('2026-09-01');
    await store().setLastRedDay('2026-09-15');
    expect((await repo.loadAll()).days).toEqual([day('2026-09-15', RED)]);
    await store().setLastRedDay('2026-09-15');
    expect((await repo.loadAll()).days).toEqual([day('2026-09-15', RED)]);
    await store().setLastRedDay(null);
    expect((await repo.loadAll()).days).toEqual([]);
    expect(store().days).toEqual({});
  });

  it('keeps a check-in on the days it touches', async () => {
    await initWith({ days: [day('2026-09-01', null, true), day('2026-09-15', null, true)] });
    await store().setLastRedDay('2026-09-01');
    expect(store().days['2026-09-01']).toEqual(day('2026-09-01', RED, true));
    await store().setLastRedDay('2026-09-15');
    expect(store().days['2026-09-01']).toEqual(day('2026-09-01', null, true));
    expect(store().days['2026-09-15']).toEqual(day('2026-09-15', RED, true));
  });

  it('rejects today, future and malformed dates, and runs only during onboarding', async () => {
    await initWith();
    await expect(store().setLastRedDay(TODAY)).rejects.toThrow(RangeError);
    await expect(store().setLastRedDay(TOMORROW)).rejects.toThrow(RangeError);
    await expect(store().setLastRedDay('not-a-date')).rejects.toThrow(RangeError);
    await store().completeOnboarding();
    await expect(store().setLastRedDay('2026-09-01')).rejects.toThrow('onboarding');
    expect(store().days).toEqual({});
  });
});

describe('completeOnboarding', () => {
  it('sets onboardingDone and installDate to today', async () => {
    const repo = await initWith();
    await store().completeOnboarding();
    const expected: Settings = { ...DEFAULT_SETTINGS, onboardingDone: true, installDate: TODAY };
    expect(store().settings).toEqual(expected);
    expect((await repo.loadAll()).settings).toEqual(expected);
  });
});

describe('replaceAll', () => {
  it('replaces every table and reloads state from the repository', async () => {
    const repo = await initWith({
      days: [day('2026-10-01', RED)],
      behaviors: [behavior(1, GREEN, 'Walk', 0)],
      settings: { ...DEFAULT_SETTINGS, partner: { name: 'Old', phone: '1' } },
    });

    const incoming = snapshot({
      days: [day(YESTERDAY, GREEN, true), day('2026-10-02', null, false), day(TODAY, BLUE)],
      behaviors: [behavior(4, RED, 'Late nights alone', 1), behavior(3, BLUE, 'Skipped prayer', 0)],
      settings: {
        ...DEFAULT_SETTINGS,
        partner: { name: 'Sam', phone: '+1 555 0100' },
        installDate: '2026-09-01',
        onboardingDone: true,
      },
    });
    await store().replaceAll(incoming);

    const s = store();
    expect(s.ready).toBe(true);
    expect(s.days).toEqual({
      [YESTERDAY]: day(YESTERDAY, GREEN, true),
      [TODAY]: day(TODAY, BLUE),
    });
    expect(s.behaviors).toEqual([behavior(3, BLUE, 'Skipped prayer', 0), behavior(4, RED, 'Late nights alone', 1)]);
    expect(s.settings).toEqual(incoming.settings);

    const stored = await repo.loadAll();
    expect(stored.days).toEqual([day(YESTERDAY, GREEN, true), day(TODAY, BLUE)]);
    expect(stored.behaviors).toEqual(s.behaviors);
    expect(stored.settings).toEqual(incoming.settings);
  });

  it('keeps adding behaviors after an import without id clashes', async () => {
    await initWith();
    await store().replaceAll(snapshot({ behaviors: [behavior(10, GREEN, 'Walk', 0)] }));
    await store().addBehavior(GREEN, 'Run');
    const [walk, run] = store().behaviors;
    expect(walk).toEqual(behavior(10, GREEN, 'Walk', 0));
    expect(run.text).toBe('Run');
    expect(run.id).toBeGreaterThan(10);
    expect(run.sortOrder).toBe(1);
  });
});

describe('settingsFromRows', () => {
  it('merges valid stored values over the defaults', () => {
    const settings = settingsFromRows([
      { key: 'onboardingDone', value: 'true' },
      { key: 'partner', value: JSON.stringify({ name: 'Sam', phone: '123' }) },
      { key: 'reminder', value: JSON.stringify({ enabled: true, hour: 6, minute: 5 }) },
      { key: 'installDate', value: JSON.stringify('2026-09-01') },
    ]);
    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      onboardingDone: true,
      partner: { name: 'Sam', phone: '123' },
      reminder: { enabled: true, hour: 6, minute: 5 },
      installDate: '2026-09-01',
    });
  });

  it('falls back to the default for unparsable, invalid or unknown rows', () => {
    const settings = settingsFromRows([
      { key: 'onboardingDone', value: 'not json' },
      { key: 'reminder', value: JSON.stringify({ enabled: true, hour: 30, minute: 0 }) },
      { key: 'installDate', value: JSON.stringify('2026-02-30') },
      { key: 'counterStartDate', value: JSON.stringify('2026-09-01') }, // no longer a setting
      { key: 'somethingElse', value: '1' },
      { key: '__proto__', value: '{"polluted":true}' },
    ]);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.reminder).not.toBe(DEFAULT_SETTINGS.reminder);
  });
});
