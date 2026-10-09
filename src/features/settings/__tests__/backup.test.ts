import { buildDemoState } from '@/domain/demo';
import { DEFAULT_SETTINGS, STATE_VERSION } from '@/store';
import type { PersistedState } from '@/types';
import { backupFileName, backupSummary, mergeImportedSettings, parseBackup, serializeBackup } from '../logic/backup';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const NOW = new Date(2026, 9, 9, 14, 30).getTime();

function demo(): PersistedState {
  return buildDemoState(NOW);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function expectError(input: unknown, pattern: RegExp) {
  const res = parseBackup(input);
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error).toMatch(pattern);
}

describe('backupFileName', () => {
  it('uses the local date, zero padded', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59).getTime())).toBe('quit-backup-2026-01-05.json');
    expect(backupFileName(NOW)).toBe('quit-backup-2026-10-09.json');
  });
});

describe('serializeBackup + parseBackup', () => {
  it('round-trips the demo state', () => {
    const state = demo();
    const json = serializeBackup(state, NOW);
    const parsed = JSON.parse(json);
    expect(parsed.exportedAt).toBe(new Date(NOW).toISOString());
    expect(parsed.app).toBe('quit');

    const res = parseBackup(json);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.exportedAt).toBe(NOW);
    expect(res.data.habits).toEqual(state.habits);
    expect(res.data.relapses).toEqual(state.relapses);
    expect(res.data.journal).toEqual(state.journal);
    expect(res.data.sosSessions).toEqual(state.sosSessions);
    expect(res.data.unlocks).toEqual(state.unlocks);
    expect(res.data.settings).toEqual({ ...state.settings, onboardingCompleted: true });
    expect(res.data.version).toBe(STATE_VERSION);
  });

  it('keeps a valid archivedAt on archived habits (and only there)', () => {
    const state = clone(demo());
    const archivedAt = NOW - 86_400_000;
    const habits = [
      { ...state.habits[0], archived: true, archivedAt },
      { ...state.habits[1], archived: false, archivedAt },
      ...state.habits.slice(2),
    ];
    const res = parseBackup({ ...state, habits });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.habits[0]).toMatchObject({ archived: true, archivedAt });
    expect(res.data.habits[1]).not.toHaveProperty('archivedAt');
    expect(res.data.habits[2]).not.toHaveProperty('archivedAt');
    expectError({ ...state, habits: [{ ...state.habits[0], archived: true, archivedAt: 'yesterday' }, ...state.habits.slice(1)] }, /archivedAt/);
  });

  it('accepts an already-parsed object and an empty data set', () => {
    const res = parseBackup({ version: 1, habits: [], relapses: [], journal: [], sosSessions: [], settings: {} });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.exportedAt).toBeNull();
    expect(res.data.settings).toEqual({ ...DEFAULT_SETTINGS, onboardingCompleted: true });
    expect(res.data.unlocks).toEqual({ achievements: {}, certificates: {}, celebrated: {} });
  });

  it('always marks onboarding as completed', () => {
    const state = clone(demo());
    state.settings.onboardingCompleted = false;
    const res = parseBackup(state);
    expect(res.ok && res.data.settings.onboardingCompleted).toBe(true);
  });

  it('strips unknown fields', () => {
    const state = clone(demo()) as any;
    state.habits[0].evil = 'x';
    state.settings.isPro = true;
    const res = parseBackup(state);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect((res.data.habits[0] as any).evil).toBeUndefined();
    expect((res.data.settings as any).isPro).toBeUndefined();
  });

  it('unlinks journal entries and SOS sessions that point to missing habits', () => {
    const state = clone(demo());
    state.journal[0].habitId = 'gone';
    state.sosSessions[0].habitId = 'gone';
    const res = parseBackup(state);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.journal[0].habitId).toBeNull();
    expect(res.data.sosSessions[0].habitId).toBeNull();
  });
});

describe('parseBackup rejects bad input', () => {
  it('rejects non-JSON, empty and non-object input', () => {
    expectError('not json {', /valid JSON/);
    expectError('   ', /empty/);
    expectError('[1,2,3]', /doesn’t look like a Quit backup/);
    expectError(null, /doesn’t look like a Quit backup/);
    expectError({ foo: 1 }, /no habits or settings/);
  });

  it('rejects missing or future versions', () => {
    const state = clone(demo()) as any;
    delete state.version;
    expectError(state, /version/);
    expectError({ ...clone(demo()), version: STATE_VERSION + 1 }, /newer version/);
  });

  it('requires every collection to be a list', () => {
    const state = clone(demo()) as any;
    state.journal = {};
    expectError(state, /“journal” list/);
  });

  it('validates habit fields', () => {
    const cases: [string, unknown, RegExp][] = [
      ['startedAt', 'yesterday', /Habit #1 has an invalid “startedAt”/],
      ['startedAt', 1_700_000_000, /out-of-range “startedAt”/], // seconds, not ms
      ['dailyCost', -1, /out-of-range “dailyCost”/],
      ['kind', 'knitting', /unknown kind/],
      ['color', 'red', /invalid color/],
      ['currency', 'dollars', /currency code/],
      ['name', '   ', /empty “name”/],
      ['archived', 'no', /“archived”/],
      ['goalDays', 2.5, /“goalDays”/],
    ];
    for (const [field, value, pattern] of cases) {
      const state = clone(demo()) as any;
      state.habits[0][field] = value;
      expectError(state, pattern);
    }
    const missing = clone(demo()) as any;
    delete missing.habits[1].id;
    expectError(missing, /Habit #2 is missing “id”/);
  });

  it('rejects duplicate ids', () => {
    const state = clone(demo());
    state.habits[1].id = state.habits[0].id;
    expectError(state, /appears twice/);
  });

  it('validates relapses', () => {
    const orphan = clone(demo());
    orphan.relapses[0].habitId = 'nope';
    expectError(orphan, /Relapse #1 belongs to a habit that is not in the backup/);

    const badTrigger = clone(demo()) as any;
    badTrigger.relapses[0].triggers = ['stress', 'aliens'];
    expectError(badTrigger, /invalid triggers/);

    const badMood = clone(demo()) as any;
    badMood.relapses[0].mood = 'meh';
    expectError(badMood, /invalid mood/);
  });

  it('validates journal, SOS and settings', () => {
    const j = clone(demo()) as any;
    j.journal[0].mood = 'meh';
    expectError(j, /Journal entry #1 has an invalid mood/);

    const s = clone(demo()) as any;
    s.sosSessions[0].exerciseId = 'yoga';
    expectError(s, /unknown exercise/);

    const t = clone(demo()) as any;
    t.settings.dailyReminderTime = { hour: 25, minute: 0 };
    expectError(t, /Reminder time/);

    const w = clone(demo()) as any;
    w.settings.weekStartsOn = 3;
    expectError(w, /week start/);

    const u = clone(demo()) as any;
    u.unlocks.celebrated = { x: 'yes' };
    expectError(u, /Celebrations/);
  });
});

describe('backupSummary', () => {
  it('lists non-empty collections', () => {
    expect(backupSummary(demo())).toBe('4 habits · 6 journal entries · 5 relapses · 4 SOS sessions');
    expect(backupSummary({ habits: [demo().habits[0]], journal: [], relapses: [], sosSessions: [] })).toBe('1 habit');
  });
});

describe('mergeImportedSettings', () => {
  it('keeps this device’s app lock and haptics, takes everything else from the backup', () => {
    const current = { ...DEFAULT_SETTINGS, appLockEnabled: true, hapticsEnabled: false, userName: 'Me' };
    const imported = {
      ...DEFAULT_SETTINGS,
      appLockEnabled: false,
      hapticsEnabled: true,
      userName: 'Backup',
      weekStartsOn: 0 as const,
      dailyReminderEnabled: true,
    };
    expect(mergeImportedSettings(imported, current)).toEqual({
      ...imported,
      appLockEnabled: true,
      hapticsEnabled: false,
    });
  });

  it('cannot turn the lock on from a backup either', () => {
    const merged = mergeImportedSettings({ ...DEFAULT_SETTINGS, appLockEnabled: true }, { ...DEFAULT_SETTINGS, appLockEnabled: false });
    expect(merged.appLockEnabled).toBe(false);
  });
});
