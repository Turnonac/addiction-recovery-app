/**
 * Timestamp-based exercise clock. Nothing here counts ticks: every reading is
 * derived from `Date.now()` deltas, so the clock stays correct when the app is
 * backgrounded or the JS thread stalls. Pauses accumulate into `pausedMs`.
 *
 * Two readings are exposed:
 * - `activeMs`: real time spent in the exercise (excludes pauses) — what gets logged.
 * - `timelineMs`: position on the exercise timeline — `activeMs` plus any manual
 *   skips ("Next step"), which shift the timeline without inflating the log.
 */
export interface ClockState {
  startedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Total ms spent paused (completed pauses only). */
  pausedMs: number;
  /** Ms added to the timeline by skips. */
  offsetMs: number;
}

export function startClock(now: number): ClockState {
  return { startedAt: now, pausedAt: null, pausedMs: 0, offsetMs: 0 };
}

export function isPaused(c: ClockState): boolean {
  return c.pausedAt != null;
}

/** Real, un-paused time spent since start. Frozen while paused. */
export function activeMs(c: ClockState, now: number): number {
  const end = c.pausedAt ?? now;
  return Math.max(0, end - c.startedAt - c.pausedMs);
}

/** Position on the exercise timeline (active time + skips). */
export function timelineMs(c: ClockState, now: number): number {
  return Math.max(0, activeMs(c, now) + c.offsetMs);
}

export function pauseClock(c: ClockState, now: number): ClockState {
  if (c.pausedAt != null) return c;
  return { ...c, pausedAt: Math.max(now, c.startedAt) };
}

export function resumeClock(c: ClockState, now: number): ClockState {
  if (c.pausedAt == null) return c;
  return { ...c, pausedAt: null, pausedMs: c.pausedMs + Math.max(0, now - c.pausedAt) };
}

/** Jump the timeline forward to `targetMs` (never backwards). */
export function seekClock(c: ClockState, now: number, targetMs: number): ClockState {
  const current = timelineMs(c, now);
  if (targetMs <= current) return c;
  return { ...c, offsetMs: c.offsetMs + (targetMs - current) };
}

/**
 * Seconds to log for a session. A timed exercise that ran to its end logs the
 * real time it took to reach the end (so a long stay in the background after
 * the timeline finished is not counted); everything else logs active time.
 */
export function sessionSeconds(c: ClockState, now: number, totalMs: number | null): number {
  let ms = activeMs(c, now);
  if (totalMs != null) ms = Math.min(ms, Math.max(0, totalMs - c.offsetMs));
  return Math.max(0, Math.round(ms / 1000));
}
