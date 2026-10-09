import type { Habit, IconName } from '@/types';

export type StatsScope = 'habit' | 'all';
export type StatsTab = 'streaks' | 'compare' | 'savings' | 'triggers' | 'mood';

export const STATS_TABS: { value: StatsTab; label: string; icon: IconName }[] = [
  { value: 'streaks', label: 'Streaks', icon: 'fire' },
  { value: 'compare', label: 'Compare', icon: 'chart-bar' },
  { value: 'savings', label: 'Savings', icon: 'cash-multiple' },
  { value: 'triggers', label: 'Triggers', icon: 'lightning-bolt' },
  { value: 'mood', label: 'Mood', icon: 'emoticon-outline' },
];

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** `?tab=` → a known tab (case-insensitive), defaulting to Streaks. */
export function parseTab(v: string | string[] | undefined): StatsTab {
  const raw = first(v)?.toLowerCase();
  return STATS_TABS.find((t) => t.value === raw)?.value ?? 'streaks';
}

/** `?habitId=` → its value when non-empty. */
export function parseHabitId(v: string | string[] | undefined): string | undefined {
  const raw = first(v)?.trim();
  return raw ? raw : undefined;
}

/**
 * A habit id in the link opens on "This habit"; otherwise "All habits". A link to a
 * habit that no longer exists (`exists` false) opens on "All habits" too, rather than
 * silently showing some other habit.
 */
export function initialScope(habitId: string | undefined, exists: boolean = true): StatsScope {
  return habitId && exists ? 'habit' : 'all';
}

/**
 * Habits offered by the "This habit" picker: active habits in home order, plus the
 * requested one when it is archived (so links from an archived habit still work).
 */
export function pickableHabits(active: Habit[], all: Habit[], requestedId: string | undefined): Habit[] {
  if (!requestedId || active.some((h) => h.id === requestedId)) return active;
  const extra = all.find((h) => h.id === requestedId);
  return extra ? [...active, extra] : active;
}

/** The selected habit, falling back to the first pickable one (e.g. after a delete). */
export function selectHabit(pickable: Habit[], id: string | undefined): Habit | undefined {
  return pickable.find((h) => h.id === id) ?? pickable[0];
}
