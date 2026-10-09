import type { ExerciseId } from '@/types';
import { BODY_REGIONS, COLD_STEPS } from '../content';

/* ---------------------------------------------------------------------------
 * Breathing patterns
 * ------------------------------------------------------------------------- */

export type BreathKind = 'in' | 'hold' | 'out' | 'rest';

export interface BreathPhase {
  kind: BreathKind;
  label: string;
  hint: string;
  ms: number;
}

export interface BreathingPattern {
  phases: BreathPhase[];
  cycles: number;
}

export const PATTERN_478: BreathingPattern = {
  cycles: 4,
  phases: [
    { kind: 'in', label: 'Breathe in', hint: 'Quietly through your nose', ms: 4000 },
    { kind: 'hold', label: 'Hold', hint: 'Keep your shoulders soft', ms: 7000 },
    { kind: 'out', label: 'Breathe out', hint: 'Slowly through your mouth — whoosh', ms: 8000 },
  ],
};

export const PATTERN_BOX: BreathingPattern = {
  cycles: 4,
  phases: [
    { kind: 'in', label: 'Breathe in', hint: 'Fill your lungs slowly', ms: 4000 },
    { kind: 'hold', label: 'Hold', hint: 'Stay still and full', ms: 4000 },
    { kind: 'out', label: 'Breathe out', hint: 'Empty your lungs gently', ms: 4000 },
    { kind: 'rest', label: 'Hold', hint: 'Rest before the next breath', ms: 4000 },
  ],
};

export function cycleMs(p: BreathingPattern): number {
  return p.phases.reduce((acc, ph) => acc + ph.ms, 0);
}

export function patternTotalMs(p: BreathingPattern): number {
  return cycleMs(p) * p.cycles;
}

export interface BreathingState {
  phase: BreathPhase;
  phaseIndex: number;
  /** 1-based cycle number. */
  cycle: number;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  /** 0..1 progress through the current phase. */
  phaseProgress: number;
  done: boolean;
  totalMs: number;
}

/** Where a breathing pattern is at `elapsedMs` since it started. */
export function breathingPhaseAt(pattern: BreathingPattern, elapsedMs: number): BreathingState {
  const totalMs = patternTotalMs(pattern);
  const last = pattern.phases.length - 1;
  if (elapsedMs >= totalMs) {
    return {
      phase: pattern.phases[last],
      phaseIndex: last,
      cycle: pattern.cycles,
      phaseElapsedMs: pattern.phases[last].ms,
      phaseRemainingMs: 0,
      phaseProgress: 1,
      done: true,
      totalMs,
    };
  }
  const t = Math.max(0, elapsedMs);
  const per = cycleMs(pattern);
  const cycleIndex = Math.floor(t / per);
  let within = t - cycleIndex * per;
  let phaseIndex = 0;
  while (phaseIndex < last && within >= pattern.phases[phaseIndex].ms) {
    within -= pattern.phases[phaseIndex].ms;
    phaseIndex += 1;
  }
  const phase = pattern.phases[phaseIndex];
  return {
    phase,
    phaseIndex,
    cycle: cycleIndex + 1,
    phaseElapsedMs: within,
    phaseRemainingMs: phase.ms - within,
    phaseProgress: phase.ms > 0 ? within / phase.ms : 1,
    done: false,
    totalMs,
  };
}

/** Sine ease-in-out, same curve as Reanimated's Easing.inOut(Easing.sin). */
export function easeInOutSine(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return (1 - Math.cos(Math.PI * c)) / 2;
}

/** Scale the breathing orb should be at for a phase + progress (in grows, out shrinks). */
export function breathScale(kind: BreathKind, progress: number, min = 0.6, max = 1): number {
  switch (kind) {
    case 'in':
      return min + (max - min) * easeInOutSine(progress);
    case 'out':
      return max - (max - min) * easeInOutSine(progress);
    case 'hold':
      return max;
    default:
      return min;
  }
}

/** Scale a phase ends at. */
export function breathTargetScale(kind: BreathKind, min = 0.6, max = 1): number {
  return kind === 'in' || kind === 'hold' ? max : min;
}

/**
 * Point on a unit square for box breathing. `t` runs 0..4, one unit per edge:
 * 0→1 up the left edge (in), 1→2 along the top (hold), 2→3 down the right
 * (out), 3→4 back along the bottom (hold). Returns x/y in 0..1 (y down).
 */
export function boxPoint(t: number): { x: number; y: number } {
  'worklet';
  const c = Math.max(0, Math.min(4, t));
  const edge = Math.min(3, Math.floor(c));
  const f = c - edge;
  if (edge === 0) return { x: 0, y: 1 - f };
  if (edge === 1) return { x: f, y: 0 };
  if (edge === 2) return { x: 1, y: f };
  return { x: 1 - f, y: 1 };
}

/* ---------------------------------------------------------------------------
 * Generic segment timelines (body scan regions, cold-water steps, prompts)
 * ------------------------------------------------------------------------- */

export interface SegmentState {
  index: number;
  elapsedInMs: number;
  remainingMs: number;
  /** 0..1 progress through the current segment. */
  progress: number;
  done: boolean;
}

export function segmentStart(durations: number[], index: number): number {
  let acc = 0;
  for (let i = 0; i < index && i < durations.length; i += 1) acc += durations[i];
  return acc;
}

export function segmentsTotal(durations: number[]): number {
  return segmentStart(durations, durations.length);
}

/** Which segment of a back-to-back sequence is active at `elapsedMs`. */
export function segmentAt(durations: number[], elapsedMs: number): SegmentState {
  const total = segmentsTotal(durations);
  const last = Math.max(0, durations.length - 1);
  if (!durations.length || elapsedMs >= total) {
    return { index: last, elapsedInMs: durations[last] ?? 0, remainingMs: 0, progress: 1, done: true };
  }
  let rest = Math.max(0, elapsedMs);
  let index = 0;
  while (index < last && rest >= durations[index]) {
    rest -= durations[index];
    index += 1;
  }
  const d = durations[index];
  return { index, elapsedInMs: rest, remainingMs: d - rest, progress: d > 0 ? rest / d : 1, done: false };
}

/** Index of a message that rotates every `periodMs` through `count` items. */
export function rotatingIndex(elapsedMs: number, periodMs: number, count: number): number {
  if (count <= 0 || periodMs <= 0) return 0;
  return Math.floor(Math.max(0, elapsedMs) / periodMs) % count;
}

/* ---------------------------------------------------------------------------
 * Per-exercise timelines
 * ------------------------------------------------------------------------- */

export const WAIT_IT_OUT_MS = 10 * 60 * 1000;
export const WAIT_MESSAGE_MS = 30 * 1000;
export const MEDITATION_MS = 60 * 1000;
export const MEDITATION_PROMPT_MS = 15 * 1000;
export const BODY_REGION_MS = 20 * 1000;
export const COLD_STEP_MS = 30 * 1000;

/** Fixed length of each timed exercise; null = user-paced (step by step). */
export function exerciseTimelineMs(id: ExerciseId): number | null {
  switch (id) {
    case 'breathing_478':
      return patternTotalMs(PATTERN_478);
    case 'box_breathing':
      return patternTotalMs(PATTERN_BOX);
    case 'wait_it_out':
      return WAIT_IT_OUT_MS;
    case 'body_scan':
      return BODY_REGIONS.length * BODY_REGION_MS;
    case 'meditation_1min':
      return MEDITATION_MS;
    case 'cold_water':
      return COLD_STEPS.length * COLD_STEP_MS;
    default:
      return null;
  }
}

/* ---------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------- */

/** "1:05" / "10:00" from ms (floored to the second). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Countdown text: rounds up so "0:00" only shows when time is truly up. */
export function formatCountdown(ms: number): string {
  return formatClock(Math.ceil(Math.max(0, ms) / 1000) * 1000);
}

/** Whole seconds left, rounded up (the big digit inside the breathing orb). */
export function secondsLeft(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

/** "a few seconds" / "45 sec" / "1 min 16 sec" / "10 min" for the completion summary. */
export function formatSpoken(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 5) return 'a few seconds';
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} sec`;
  if (!r) return `${m} min`;
  return `${m} min ${r} sec`;
}
