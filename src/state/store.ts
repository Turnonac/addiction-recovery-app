import { z } from 'zod';
import { create } from 'zustand';

import { defaultSettings, isEmptyDay, sortBehaviors, type Repository } from '@/data/repository';
import { decideSetColor } from '@/domain/checkin';
import { addDays, isValidLocalDate, todayLocal } from '@/domain/dates';
import { redDates } from '@/domain/streak';
import {
  RED,
  type AppSnapshot,
  type Behavior,
  type ColorLevel,
  type DayLog,
  type LocalDate,
  type Partner,
  type Reminder,
  type SetColorOutcome,
  type Settings,
} from '@/domain/types';

/** Longest behavior line, in UTF-16 code units (matches TextInput maxLength). */
export const BEHAVIOR_MAX_LENGTH = 120;

export interface AppState {
  ready: boolean;
  today: LocalDate;
  days: Record<LocalDate, DayLog>;
  /** Sorted by color, then sortOrder. */
  behaviors: Behavior[];
  settings: Settings;
  /** Loads the snapshot from `repo` (used for every later write) and sets `ready`. */
  init(repo: Repository): Promise<void>;
  /** Recompute `today` (call at midnight and when the app returns to the foreground). */
  refreshToday(): void;
  setColor(
    date: LocalDate,
    color: ColorLevel,
    opts?: { confirmBetter?: boolean },
  ): Promise<SetColorOutcome>;
  /** Future days are ignored. A day left with no color and no check-in is deleted. */
  setCheckedIn(date: LocalDate, value: boolean): Promise<void>;
  /** Text is trimmed and cut to BEHAVIOR_MAX_LENGTH; empty text is a no-op. */
  addBehavior(color: ColorLevel, text: string): Promise<void>;
  /** Text is trimmed and cut to BEHAVIOR_MAX_LENGTH; empty text or an unknown id is a no-op. */
  updateBehavior(id: number, text: string): Promise<void>;
  removeBehavior(id: number): Promise<void>;
  setPartner(partner: Partner | null): Promise<void>;
  /** Persists only; screens call services/notifications. */
  setReminder(reminder: Reminder): Promise<void>;
  /**
   * Onboarding only. "My last Red day was…": `date` (before today) becomes a Red day,
   * replacing the one saved here before (the latest Red before today). null ("Start
   * counting today") just removes that one.
   */
  setLastRedDay(date: LocalDate | null): Promise<void>;
  /** Sets onboardingDone and installDate = today. */
  completeOnboarding(): Promise<void>;
  /** `iso` must be an ISO-8601 instant (e.g. new Date().toISOString()). */
  markExported(iso: string): Promise<void>;
  replaceAll(snapshot: AppSnapshot): Promise<void>;
}

// Set by init(). Kept out of the state so it is not part of the public contract;
// writes also require `ready`, so resetting the state detaches it.
let repository: Repository | null = null;

// Writes run one at a time, so each one decides against the state the previous
// one left (e.g. two quick color taps on the same day).
let queue: Promise<unknown> = Promise.resolve();

function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

function assertValidDate(date: string): void {
  if (!isValidLocalDate(date)) throw new RangeError(`Invalid date: ${date}`);
}

const IsoInstant = z.iso.datetime({ offset: true });

function cleanBehaviorText(text: string): string {
  let clean = text.trim();
  if (clean.length > BEHAVIOR_MAX_LENGTH) {
    let end = BEHAVIOR_MAX_LENGTH;
    // Do not split a surrogate pair (emoji etc.).
    const code = clean.charCodeAt(end - 1);
    if (code >= 0xd800 && code <= 0xdbff) end -= 1;
    clean = clean.slice(0, end).trimEnd();
  }
  return clean;
}

function withoutDay(days: Record<LocalDate, DayLog>, date: LocalDate): Record<LocalDate, DayLog> {
  const next = { ...days };
  delete next[date];
  return next;
}

function stateFromSnapshot(
  snapshot: AppSnapshot,
): Pick<AppState, 'days' | 'behaviors' | 'settings'> {
  const days: Record<LocalDate, DayLog> = {};
  for (const day of snapshot.days) {
    if (!isEmptyDay(day)) days[day.date] = { ...day };
  }
  return {
    days,
    behaviors: sortBehaviors(snapshot.behaviors),
    settings: { ...defaultSettings(), ...snapshot.settings },
  };
}

export const useAppStore = create<AppState>()((set, get) => {
  function requireRepo(): Repository {
    if (repository === null || !get().ready) {
      throw new Error('useAppStore: call init(repo) before writing');
    }
    return repository;
  }

  /** todayLocal(), also written to state if the day has changed. */
  function syncToday(): LocalDate {
    const today = todayLocal();
    if (get().today !== today) set({ today });
    return today;
  }

  /** Persist the merged settings, then publish them. Call inside serial(). */
  async function saveSettings(patch: Partial<Settings>): Promise<void> {
    const next: Settings = { ...get().settings, ...patch };
    await requireRepo().saveSettings(next);
    set({ settings: next });
  }

  return {
    ready: false,
    today: todayLocal(),
    days: {},
    behaviors: [],
    settings: defaultSettings(),

    init: (repo) =>
      serial(async () => {
        repository = repo;
        const snapshot = await repo.loadAll();
        set({ ...stateFromSnapshot(snapshot), today: todayLocal(), ready: true });
      }),

    refreshToday: () => {
      syncToday();
    },

    setColor: (date, color, opts = {}) =>
      serial(async () => {
        assertValidDate(date);
        const repo = requireRepo();
        const today = syncToday();
        const outcome = decideSetColor(get().days[date], date, color, opts, today);
        if (outcome.kind !== 'saved') return outcome;
        await repo.upsertDay(outcome.day);
        set((s) => ({ days: { ...s.days, [date]: outcome.day } }));
        return outcome;
      }),

    setCheckedIn: (date, value) =>
      serial(async () => {
        assertValidDate(date);
        const repo = requireRepo();
        if (date > syncToday()) return;
        const existing = get().days[date];
        if ((existing?.checkedIn ?? false) === value) return;
        const day: DayLog = { date, color: existing?.color ?? null, checkedIn: value };
        if (isEmptyDay(day)) {
          await repo.deleteDay(date);
          set((s) => ({ days: withoutDay(s.days, date) }));
          return;
        }
        await repo.upsertDay(day);
        set((s) => ({ days: { ...s.days, [date]: day } }));
      }),

    addBehavior: (color, text) =>
      serial(async () => {
        const clean = cleanBehaviorText(text);
        if (clean === '') return;
        const behavior = await requireRepo().addBehavior(color, clean);
        set((s) => ({ behaviors: sortBehaviors([...s.behaviors, behavior]) }));
      }),

    updateBehavior: (id, text) =>
      serial(async () => {
        const clean = cleanBehaviorText(text);
        if (clean === '') return;
        const current = get().behaviors.find((b) => b.id === id);
        if (current === undefined || current.text === clean) return;
        await requireRepo().updateBehavior(id, clean);
        set((s) => ({ behaviors: s.behaviors.map((b) => (b.id === id ? { ...b, text: clean } : b)) }));
      }),

    removeBehavior: (id) =>
      serial(async () => {
        await requireRepo().deleteBehavior(id);
        set((s) => ({ behaviors: s.behaviors.filter((b) => b.id !== id) }));
      }),

    setPartner: (partner) =>
      serial(() =>
        saveSettings({
          partner: partner ? { name: partner.name.trim(), phone: partner.phone.trim() } : null,
        }),
      ),

    setReminder: (reminder) =>
      serial(async () => {
        const { enabled, hour, minute } = reminder;
        if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
          throw new RangeError(`Invalid reminder hour: ${hour}`);
        }
        if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
          throw new RangeError(`Invalid reminder minute: ${minute}`);
        }
        await saveSettings({ reminder: { enabled, hour, minute } });
      }),

    setLastRedDay: (date) =>
      serial(async () => {
        if (date !== null) assertValidDate(date);
        const repo = requireRepo();
        if (get().settings.onboardingDone) throw new Error('setLastRedDay: onboarding only');
        const today = syncToday();
        if (date !== null && date >= today) throw new RangeError(`Last Red day must be before today: ${date}`);
        const previous = redDates(Object.values(get().days), addDays(today, -1)).at(-1) ?? null;
        if (previous === date) return;
        if (previous !== null) {
          const cleared: DayLog = { ...get().days[previous], color: null };
          if (isEmptyDay(cleared)) {
            await repo.deleteDay(previous);
            set((s) => ({ days: withoutDay(s.days, previous) }));
          } else {
            await repo.upsertDay(cleared);
            set((s) => ({ days: { ...s.days, [previous]: cleared } }));
          }
        }
        if (date !== null) {
          const day: DayLog = { date, color: RED, checkedIn: get().days[date]?.checkedIn ?? false };
          await repo.upsertDay(day);
          set((s) => ({ days: { ...s.days, [date]: day } }));
        }
      }),

    completeOnboarding: () =>
      serial(async () => {
        const today = syncToday();
        await saveSettings({ onboardingDone: true, installDate: today });
      }),

    markExported: (iso) =>
      serial(async () => {
        // Must stay valid for BackupSchemaV2, or the next export could not be imported.
        if (!IsoInstant.safeParse(iso).success) throw new RangeError(`Invalid ISO instant: ${iso}`);
        await saveSettings({ lastExportAt: iso });
      }),

    replaceAll: (snapshot) =>
      serial(async () => {
        const repo = requireRepo();
        await repo.replaceAll(snapshot);
        const loaded = await repo.loadAll();
        set({ ...stateFromSnapshot(loaded), today: todayLocal() });
      }),
  };
});
