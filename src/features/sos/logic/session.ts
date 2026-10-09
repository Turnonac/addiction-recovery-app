import { EXERCISES } from '@/domain/catalog/exercises';
import { DAY, HOUR, MINUTE } from '@/domain/time';
import type { ExerciseId, Habit } from '@/types';

export const INTENSITY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type Param = string | string[] | undefined;

function first(v: Param): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Route param → craving intensity 1..10, or null if missing/invalid. */
export function parseIntensity(v: Param): number | null {
  const raw = first(v);
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 10) return null;
  return n;
}

export function isExerciseId(v: Param): v is ExerciseId {
  const raw = first(v);
  return raw != null && EXERCISES.some((e) => e.id === raw);
}

/** Route param → exercise id, or null when missing/unknown. */
export function parseExerciseId(v: Param): ExerciseId | null {
  const raw = first(v);
  return isExerciseId(raw) ? raw : null;
}

/**
 * The exercise to preselect in the picker: the one after `last` in the catalog
 * (wrapping around), so "Try another exercise" never suggests the one just done.
 * Without `last` it is the first exercise.
 */
export function nextExerciseId(last: ExerciseId | null): ExerciseId {
  const i = last ? EXERCISES.findIndex((e) => e.id === last) : -1;
  return EXERCISES[(i + 1) % EXERCISES.length].id;
}

/** Route param → habit id, or null when empty. */
export function parseHabitId(v: Param): string | null {
  const raw = first(v)?.trim();
  return raw ? raw : null;
}

/**
 * The habit the SOS flow is about: the one named in the URL (if it still
 * exists), otherwise the only active habit when there is exactly one.
 */
export function resolveContextHabit(habits: Habit[], habitId: string | null): Habit | null {
  if (habitId) {
    const named = habits.find((h) => h.id === habitId);
    if (named) return named;
  }
  const active = habits.filter((h) => !h.archived);
  return active.length === 1 ? active[0] : null;
}

/** "29 days" / "1 day" / "5 hours" / "a few minutes" for "You've been free from X for …". */
export function freeForLabel(streakMs: number): string {
  const ms = Math.max(0, streakMs);
  if (ms >= DAY) {
    const d = Math.floor(ms / DAY);
    return `${d} ${d === 1 ? 'day' : 'days'}`;
  }
  if (ms >= HOUR) {
    const h = Math.floor(ms / HOUR);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  if (ms >= 2 * MINUTE) return `${Math.floor(ms / MINUTE)} minutes`;
  return 'a few moments';
}

export type IntensityLevel = 'mild' | 'moderate' | 'strong' | 'intense';

export function intensityLevel(n: number): IntensityLevel {
  if (n <= 3) return 'mild';
  if (n <= 6) return 'moderate';
  if (n <= 8) return 'strong';
  return 'intense';
}

const LEVEL_LABEL: Record<IntensityLevel, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  strong: 'Strong',
  intense: 'Overwhelming',
};

/** "Mild" / "Moderate" / "Strong" / "Overwhelming". */
export function intensityLevelLabel(n: number): string {
  return LEVEL_LABEL[intensityLevel(n)];
}

export function intensityLabel(n: number | null): string {
  return n == null ? 'Not set' : `${n} · ${intensityLevelLabel(n)}`;
}

/** Feedback after rating the urge again on the completion screen. */
export function intensityDeltaMessage(before: number | null, after: number | null): string | null {
  if (after == null) return null;
  if (before == null) {
    if (after <= 3) return 'The urge is quiet now. Well done.';
    if (after <= 6) return "It's easing. Another exercise can take you the rest of the way.";
    return 'Still strong — that is okay. Try another exercise, the wave will pass.';
  }
  const diff = before - after;
  if (diff >= 3) return `Down ${diff} points — the wave is passing.`;
  if (diff > 0) return `Down ${diff} ${diff === 1 ? 'point' : 'points'}. Every bit counts.`;
  if (diff === 0) return 'About the same. Riding it out is still a win.';
  return 'Stronger right now — try another exercise. You have not given in.';
}

/** Headline on the completion screen. */
export function completionTitle(reachedEnd: boolean): string {
  return reachedEnd ? 'You outlasted it' : 'Well done';
}

export interface SessionDraft {
  exerciseId: ExerciseId;
  durationSec: number;
  completed: boolean;
  habitId: string | null;
  intensityBefore: number | null;
  intensityAfter: number | null;
  at: number;
}

/** Intensity to store: a whole number 1–10, or null. */
export function clampIntensity(n: number | null): number | null {
  return n == null ? null : Math.max(1, Math.min(10, Math.round(n)));
}

/** Builds the store payload for `logSosSession` (clamps the values it stores). */
export function buildSession(d: SessionDraft): SessionDraft {
  return {
    ...d,
    durationSec: Math.max(0, Math.round(d.durationSec)),
    intensityBefore: clampIntensity(d.intensityBefore),
    intensityAfter: clampIntensity(d.intensityAfter),
  };
}

/** Query string for the runner route. */
export function runnerHref(exerciseId: ExerciseId, habitId: string | null, before: number | null): string {
  const q: string[] = [];
  if (habitId) q.push(`habitId=${encodeURIComponent(habitId)}`);
  if (before != null) q.push(`before=${before}`);
  return `/sos/${exerciseId}${q.length ? `?${q.join('&')}` : ''}`;
}

/** Intensity → `before` route param (undefined clears it). */
export function intensityParam(n: number | null): string | undefined {
  return n == null ? undefined : String(n);
}

/**
 * Query string for the picker route; `before` pre-selects the urge rating and
 * `last` (the exercise just finished) makes it suggest a different one.
 */
export function pickerHref(habitId: string | null, before: number | null = null, last: ExerciseId | null = null): string {
  const q: string[] = [];
  if (habitId) q.push(`habitId=${encodeURIComponent(habitId)}`);
  if (before != null) q.push(`before=${before}`);
  if (last) q.push(`last=${last}`);
  return `/sos${q.length ? `?${q.join('&')}` : ''}`;
}

/** Route name of the picker inside the app stack. */
export const PICKER_ROUTE_NAME = 'sos/index';

/** Route name of Home inside the app stack. */
export const HOME_ROUTE_NAME = 'index';

interface RouteLike {
  name: string;
  key?: string;
}

interface NavStateLike {
  index?: number;
  routes?: readonly RouteLike[];
}

/** The route below the focused one in a stack state, if any. */
export function previousRoute(state: NavStateLike | undefined | null): RouteLike | null {
  const routes = state?.routes ?? [];
  const index = state?.index ?? routes.length - 1;
  return index >= 1 ? (routes[index - 1] ?? null) : null;
}

/** Name of the route below the focused one in a stack state, if any. */
export function previousRouteName(state: NavStateLike | undefined | null): string | null {
  return previousRoute(state)?.name ?? null;
}

/** Whether a route (by key) is still part of a stack state — false once it was popped. */
export function hasRoute(state: NavStateLike | undefined | null, key: string): boolean {
  return (state?.routes ?? []).some((r) => r.key === key);
}
