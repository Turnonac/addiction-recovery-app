import { DAY, HOUR, MINUTE } from '@/domain/time';
import { dateTimeLabel } from '@/features/habit-detail/logic';
import type { Habit, Relapse } from '@/types';
import { formatInt, formatRelativeDay, formatTime } from '@/utils/format';

/** What logging a relapse at `at` does to a habit's streaks. */
export interface RelapseOutcome {
  /** Length of the streak that ends (saved in history). */
  endedMs: number;
  /** Best streak before logging (current streak included). */
  recordBeforeMs: number;
  /** Best streak after logging. */
  recordAfterMs: number;
  /** The ended streak is (or ties) the best one ever. */
  endedIsRecord: boolean;
  /** Attempt number of the streak that starts at `at`. */
  nextAttempt: number;
  /** When the new streak starts (the relapse time, never before the current start). */
  restartAt: number;
}

/** Mirrors the store's `logRelapse` so the screen can explain the result up front. */
export function relapseOutcome(habit: Habit, relapses: Relapse[], at: number, now: number): RelapseOutcome {
  const own = relapses.filter((r) => r.habitId === habit.id);
  const restartAt = Math.max(at, habit.startedAt);
  const endedMs = Math.max(0, restartAt - habit.startedAt);
  const pastBest = own.reduce((m, r) => Math.max(m, Math.max(0, r.streakMs)), 0);
  const currentMs = Math.max(0, now - habit.startedAt);
  return {
    endedMs,
    recordBeforeMs: Math.max(pastBest, currentMs),
    recordAfterMs: Math.max(pastBest, endedMs),
    endedIsRecord: endedMs > 0 && endedMs >= pastBest,
    nextAttempt: own.length + 2,
    restartAt,
  };
}

/** "31 days", "1 day", "5 hours", "12 minutes", "under a minute". */
export function durationPhrase(ms: number): string {
  const v = Math.max(0, ms);
  if (v >= DAY) {
    const d = Math.floor(v / DAY);
    return `${formatInt(d)} ${d === 1 ? 'day' : 'days'}`;
  }
  if (v >= HOUR) {
    const h = Math.floor(v / HOUR);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  if (v >= MINUTE) {
    const m = Math.floor(v / MINUTE);
    return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  }
  return 'under a minute';
}

/** Compound adjective: "29-day", "1-day", "5-hour", "12-minute" (callers phrase sub-minute streaks themselves). */
export function streakAdjective(ms: number): string {
  const v = Math.max(0, ms);
  if (v >= DAY) return `${formatInt(Math.floor(v / DAY))}-day`;
  if (v >= HOUR) return `${Math.floor(v / HOUR)}-hour`;
  return `${Math.floor(v / MINUTE)}-minute`;
}

/** A relapse within this window of "now" counts as happening now. */
export const NOW_TOLERANCE_MS = 2 * MINUTE;

export interface PreviewLine {
  kind: 'saved' | 'record' | 'attempt';
  text: string;
}

/**
 * The short sentences under the intro:
 * "Your 29-day streak will be saved." · "Record: 31 days." · "Attempt 2 starts now."
 */
export function previewLines(outcome: RelapseOutcome, now: number): PreviewLine[] {
  const lines: PreviewLine[] = [];
  lines.push({
    kind: 'saved',
    text: outcome.endedMs < MINUTE ? 'Your streak had only just started, so nothing is lost.' : `Your ${streakAdjective(outcome.endedMs)} streak will be saved.`,
  });
  if (outcome.recordAfterMs >= MINUTE) {
    lines.push({
      kind: 'record',
      text: outcome.endedIsRecord && recordKept(outcome) ? `It stays your record: ${durationPhrase(outcome.recordAfterMs)}.` : `Record: ${durationPhrase(outcome.recordAfterMs)}.`,
    });
  }
  lines.push({ kind: 'attempt', text: `Attempt ${outcome.nextAttempt} ${restartPhrase(outcome.restartAt, now)}.` });
  return lines;
}

/**
 * "starts now" / "starts from today, 14:20" / "starts from 10 Sep, 17:23"
 * (the year only appears for another year: "starts from 28 Dec 2025, 09:00").
 */
export function restartPhrase(restartAt: number, now: number): string {
  if (Math.abs(now - restartAt) <= NOW_TOLERANCE_MS) return 'starts now';
  const day = formatRelativeDay(restartAt, now);
  if (day === 'Today' || day === 'Yesterday') return `starts from ${day.toLowerCase()}, ${formatTime(restartAt)}`;
  return `starts from ${dateTimeLabel(restartAt, now)}`;
}

/* -------------------------------------------------------------------------- */
/* When the relapse happened                                                  */
/* -------------------------------------------------------------------------- */

/** The current streak is old enough for the relapse to be dated earlier than now. */
export function canBackdate(startedAt: number, now: number): boolean {
  return now - startedAt > MINUTE;
}

/**
 * Earliest selectable relapse time: a minute into the current streak, so a new
 * relapse never shares its timestamp with the one that started the streak (undo
 * would then remove the wrong one). For a streak younger than that, only `now`.
 */
export function relapseMinAt(startedAt: number, now: number): number {
  return canBackdate(startedAt, now) ? startedAt + MINUTE : now;
}

/**
 * The time actually logged: the picked time (never in the future) when the streak
 * can be backdated, otherwise `now`; always strictly after the streak start.
 */
export function resolveRelapseAt(picked: number | null, startedAt: number, now: number): number {
  const at = picked != null && canBackdate(startedAt, now) ? Math.min(picked, now) : now;
  return Math.max(at, startedAt + 1);
}

/** A picked time this close to the real clock means "now" (logged at submit time, not at the tap). */
export function isNowPick(picked: number, clock: number): boolean {
  return Math.abs(picked - clock) <= NOW_TOLERANCE_MS;
}

/**
 * Id of the relapse the store's `undoLastRelapse` would remove for a habit: the
 * latest `at`, and on a tie the one stored first (it sorts with a stable sort).
 */
export function undoTargetId(relapses: Relapse[], habitId: string): string | null {
  let target: Relapse | null = null;
  for (const r of relapses) {
    if (r.habitId === habitId && (target == null || r.at > target.at)) target = r;
  }
  return target?.id ?? null;
}

/** False when a backdated relapse shortened the best streak. */
export function recordKept(outcome: RelapseOutcome): boolean {
  return outcome.recordAfterMs >= outcome.recordBeforeMs - MINUTE;
}

/** "Your record stays 31 days" (unchanged) or "Your record is now 19 days" (a backdated relapse shortened it). */
export function recordLine(outcome: RelapseOutcome): string {
  if (outcome.recordAfterMs < MINUTE) return 'Your first record is waiting for you';
  return `${recordKept(outcome) ? 'Your record stays' : 'Your record is now'} ${durationPhrase(outcome.recordAfterMs)}`;
}

/* -------------------------------------------------------------------------- */
/* Encouragement                                                              */
/* -------------------------------------------------------------------------- */

export interface SupportQuote {
  text: string;
  author: string | null;
}

export const SUPPORT_QUOTES: SupportQuote[] = [
  { text: 'Fall seven times, stand up eight.', author: 'Japanese proverb' },
  { text: 'Our greatest glory is not in never falling, but in rising every time we fall.', author: 'Confucius' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'A setback is a setup for a comeback.', author: null },
  { text: 'You are not starting over. You are starting from experience.', author: null },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Every day is a new beginning. Take a deep breath and start again.', author: null },
  { text: 'The only real mistake is the one from which we learn nothing.', author: 'Henry Ford' },
  { text: 'Be gentle with yourself. You are doing the best you can.', author: null },
  { text: 'Progress, not perfection.', author: null },
  { text: 'Courage does not always roar. Sometimes it is the quiet voice saying: I will try again tomorrow.', author: 'Mary Anne Radmacher' },
  { text: 'One slip does not undo the days you won. They still count.', author: null },
];

/** Deterministic pick so a re-render keeps the same quote. */
export function pickQuote(seed: number): SupportQuote {
  const n = SUPPORT_QUOTES.length;
  const i = ((Math.floor(Math.abs(seed)) % n) + n) % n;
  return SUPPORT_QUOTES[i];
}

/** Toggle an item in a multi-select list, keeping the original order of `all`. */
export function toggleInOrder<T>(selected: T[], item: T, all: readonly T[]): T[] {
  const next = selected.includes(item) ? selected.filter((x) => x !== item) : [...selected, item];
  return all.filter((x) => next.includes(x));
}

/** Headline after logging: "Attempt 2 starts now", or "Attempt 2 has begun" for a backdated relapse. */
export function doneTitle(outcome: RelapseOutcome, now: number): string {
  const startsNow = Math.abs(now - outcome.restartAt) <= NOW_TOLERANCE_MS;
  return `Attempt ${outcome.nextAttempt} ${startsNow ? 'starts now' : 'has begun'}`;
}

/** Second line of the record card on the success step. */
export function savedLine(outcome: RelapseOutcome): string {
  return outcome.endedMs >= MINUTE ? `Your ${streakAdjective(outcome.endedMs)} streak is saved in your history.` : 'Your history is up to date.';
}
