import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { presetFor } from '@/domain/catalog/habits';
import type {
  Habit,
  HabitKind,
  JournalEntry,
  MoodId,
  PersistedState,
  Relapse,
  Settings,
  SosSession,
  TriggerId,
  Unlocks,
} from '@/types';
import { makeId } from '@/utils/id';

export const STORAGE_KEY = 'quit-store-v1';
export const STATE_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  onboardingCompleted: false,
  userName: '',
  defaultCurrency: 'USD',
  appLockEnabled: false,
  dailyReminderEnabled: false,
  dailyReminderTime: { hour: 9, minute: 0 },
  milestoneNotificationsEnabled: true,
  hapticsEnabled: true,
  weekStartsOn: 1,
};

export const EMPTY_UNLOCKS: Unlocks = { achievements: {}, certificates: {}, celebrated: {} };

export interface NewHabitInput {
  kind: HabitKind;
  name?: string;
  color?: string;
  icon?: Habit['icon'];
  startedAt: number;
  dailyCost?: number;
  currency?: string;
  dailyMinutes?: number;
  goalDays?: number | null;
  reason?: string;
}

export interface RelapseInput {
  at: number;
  triggers: TriggerId[];
  mood: MoodId | null;
  note: string;
}

export interface JournalInput {
  title: string;
  body: string;
  mood: MoodId;
  habitId?: string | null;
  /** Defaults to now. */
  createdAt?: number;
}

export type SosSessionInput = Omit<SosSession, 'id'>;

export interface AppState extends PersistedState {
  /** True once persisted state has been read from storage. Not persisted. */
  hasHydrated: boolean;

  // Habits
  addHabit: (input: NewHabitInput) => string;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) => void;
  deleteHabit: (id: string) => void;
  setHabitArchived: (id: string, archived: boolean) => void;
  reorderHabits: (orderedIds: string[]) => void;

  // Relapses
  /** Ends the current streak at `input.at` and starts a new one from there. */
  logRelapse: (habitId: string, input: RelapseInput) => string | null;
  /** Reverts the most recent relapse of a habit, restoring the previous streak. */
  undoLastRelapse: (habitId: string) => void;
  updateRelapse: (id: string, patch: Partial<Pick<Relapse, 'triggers' | 'mood' | 'note'>>) => void;

  // Journal
  addJournalEntry: (input: JournalInput) => string;
  updateJournalEntry: (id: string, patch: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>) => void;
  deleteJournalEntry: (id: string) => void;

  // SOS
  logSosSession: (input: SosSessionInput) => string;

  // Settings
  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: () => void;

  // Unlocks
  unlockAchievements: (ids: string[], at: number) => void;
  claimCertificate: (key: string, at: number) => void;
  markCelebrated: (key: string) => void;

  // Data
  resetAll: () => void;
  /** Replace everything with an imported snapshot (already validated). */
  replaceAll: (data: PersistedState) => void;
  exportData: () => PersistedState;
}

export function initialPersistedState(): PersistedState {
  return {
    version: STATE_VERSION,
    habits: [],
    relapses: [],
    journal: [],
    sosSessions: [],
    settings: { ...DEFAULT_SETTINGS },
    unlocks: { achievements: {}, certificates: {}, celebrated: {} },
  };
}

/** Certificate key for a habit + milestone. */
export function certificateKey(habitId: string, days: number): string {
  return `${habitId}:${days}`;
}

/** Celebration key: a milestone is celebrated once per streak (identified by startedAt). */
export function celebrationKey(habitId: string, startedAt: number, days: number): string {
  return `${habitId}:${startedAt}:${days}`;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState(),
      hasHydrated: false,

      addHabit: (input) => {
        const preset = presetFor(input.kind);
        const id = makeId('h_');
        const now = Date.now();
        const habits = get().habits;
        const habit: Habit = {
          id,
          kind: input.kind,
          name: input.name?.trim() || preset.name,
          color: input.color ?? preset.color,
          icon: input.icon ?? preset.icon,
          startedAt: input.startedAt,
          firstStartedAt: input.startedAt,
          createdAt: now,
          dailyCost: Math.max(0, input.dailyCost ?? 0),
          currency: input.currency ?? get().settings.defaultCurrency,
          dailyMinutes: Math.max(0, input.dailyMinutes ?? 0),
          goalDays: input.goalDays ?? null,
          reason: input.reason?.trim() ?? '',
          archived: false,
          order: habits.reduce((m, h) => Math.max(m, h.order), -1) + 1,
        };
        set({ habits: [...habits, habit] });
        return id;
      },

      updateHabit: (id, patch) => {
        set({
          habits: get().habits.map((h) => {
            if (h.id !== id) return h;
            const next = { ...h, ...patch };
            // Editing the quit date of a habit with no relapses moves its first date too.
            if (patch.startedAt != null && h.startedAt === h.firstStartedAt && patch.firstStartedAt == null) {
              next.firstStartedAt = patch.startedAt;
            }
            if (next.firstStartedAt > next.startedAt) next.firstStartedAt = next.startedAt;
            return next;
          }),
        });
      },

      deleteHabit: (id) => {
        const { habits, relapses, journal, sosSessions, unlocks } = get();
        const prefix = `${id}:`;
        const strip = (rec: Record<string, any>) =>
          Object.fromEntries(Object.entries(rec).filter(([k]) => !k.startsWith(prefix)));
        set({
          habits: habits.filter((h) => h.id !== id),
          relapses: relapses.filter((r) => r.habitId !== id),
          journal: journal.map((j) => (j.habitId === id ? { ...j, habitId: null } : j)),
          sosSessions: sosSessions.map((s) => (s.habitId === id ? { ...s, habitId: null } : s)),
          unlocks: {
            ...unlocks,
            certificates: strip(unlocks.certificates),
            celebrated: strip(unlocks.celebrated) as Record<string, true>,
          },
        });
      },

      setHabitArchived: (id, archived) => {
        set({ habits: get().habits.map((h) => (h.id === id ? { ...h, archived } : h)) });
      },

      reorderHabits: (orderedIds) => {
        const pos = new Map(orderedIds.map((id, i) => [id, i]));
        set({
          habits: get().habits.map((h) => (pos.has(h.id) ? { ...h, order: pos.get(h.id)! } : h)),
        });
      },

      logRelapse: (habitId, input) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return null;
        // A relapse can't be dated before the current streak started.
        const at = Math.max(input.at, habit.startedAt);
        const relapse: Relapse = {
          id: makeId('r_'),
          habitId,
          at,
          streakMs: at - habit.startedAt,
          triggers: input.triggers,
          mood: input.mood,
          note: input.note.trim(),
        };
        set({
          relapses: [...get().relapses, relapse],
          habits: get().habits.map((h) => (h.id === habitId ? { ...h, startedAt: at } : h)),
        });
        return relapse.id;
      },

      undoLastRelapse: (habitId) => {
        const habitRelapses = get()
          .relapses.filter((r) => r.habitId === habitId)
          .sort((a, b) => b.at - a.at);
        const last = habitRelapses[0];
        if (!last) return;
        set({
          relapses: get().relapses.filter((r) => r.id !== last.id),
          habits: get().habits.map((h) => (h.id === habitId ? { ...h, startedAt: last.at - last.streakMs } : h)),
        });
      },

      updateRelapse: (id, patch) => {
        set({ relapses: get().relapses.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
      },

      addJournalEntry: (input) => {
        const now = Date.now();
        const entry: JournalEntry = {
          id: makeId('j_'),
          createdAt: input.createdAt ?? now,
          updatedAt: now,
          title: input.title.trim(),
          body: input.body.trim(),
          mood: input.mood,
          habitId: input.habitId ?? null,
        };
        set({ journal: [...get().journal, entry] });
        return entry.id;
      },

      updateJournalEntry: (id, patch) => {
        set({
          journal: get().journal.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: Date.now() } : j)),
        });
      },

      deleteJournalEntry: (id) => {
        set({ journal: get().journal.filter((j) => j.id !== id) });
      },

      logSosSession: (input) => {
        const session: SosSession = { ...input, id: makeId('s_') };
        set({ sosSessions: [...get().sosSessions, session] });
        return session.id;
      },

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      completeOnboarding: () => set({ settings: { ...get().settings, onboardingCompleted: true } }),

      unlockAchievements: (ids, at) => {
        const current = get().unlocks.achievements;
        const fresh = ids.filter((id) => current[id] == null);
        if (!fresh.length) return;
        const next = { ...current };
        for (const id of fresh) next[id] = at;
        set({ unlocks: { ...get().unlocks, achievements: next } });
      },

      claimCertificate: (key, at) => {
        const u = get().unlocks;
        if (u.certificates[key] != null) return;
        set({ unlocks: { ...u, certificates: { ...u.certificates, [key]: at } } });
      },

      markCelebrated: (key) => {
        const u = get().unlocks;
        if (u.celebrated[key]) return;
        set({ unlocks: { ...u, celebrated: { ...u.celebrated, [key]: true } } });
      },

      resetAll: () => set({ ...initialPersistedState() }),

      replaceAll: (data) =>
        set({
          version: STATE_VERSION,
          habits: data.habits,
          relapses: data.relapses,
          journal: data.journal,
          sosSessions: data.sosSessions,
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
          unlocks: { ...EMPTY_UNLOCKS, ...data.unlocks },
        }),

      exportData: () => {
        const { version, habits, relapses, journal, sosSessions, settings, unlocks } = get();
        return { version, habits, relapses, journal, sosSessions, settings, unlocks };
      },
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): PersistedState => ({
        version: s.version,
        habits: s.habits,
        relapses: s.relapses,
        journal: s.journal,
        sosSessions: s.sosSessions,
        settings: s.settings,
        unlocks: s.unlocks,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          unlocks: { ...EMPTY_UNLOCKS, ...(p.unlocks ?? {}) },
        };
      },
      onRehydrateStorage: () => () => {
        useStore.setState({ hasHydrated: true });
      },
    },
  ),
);
