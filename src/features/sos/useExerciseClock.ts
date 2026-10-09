import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { isPaused, pauseClock, resumeClock, seekClock, startClock, timelineMs, type ClockState } from './logic/clock';

/** Render cadence for timers/phase detection. Animations run on Reanimated, not on this tick. */
const TICK_MS = 100;

export interface ExerciseClock {
  /** Position on the exercise timeline (ms). */
  t: number;
  /** The timestamp `t` was read at. */
  readAt: number;
  paused: boolean;
  state: ClockState;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  /** Jump the timeline forward (e.g. "Next step"). */
  seek: (targetMs: number) => void;
}

export interface ExerciseClockOptions {
  /** Stop ticking (exercise finished early). */
  stopped: boolean;
  /** Stop ticking once the timeline reaches this length (timed exercises). */
  limitMs: number | null;
}

/**
 * Single timestamp-based clock for an exercise. Re-renders every 100ms while
 * running and stops when paused, stopped or past `limitMs`. Readings come from
 * Date.now() deltas, so backgrounding the app never skews the timer.
 */
export function useExerciseClock({ stopped, limitMs }: ExerciseClockOptions): ExerciseClock {
  const [state, setState] = useState<ClockState>(() => startClock(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const paused = isPaused(state);
  const t = timelineMs(state, now);
  const ended = stopped || (limitMs != null && t >= limitMs);

  useEffect(() => {
    if (ended || paused) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    // Catch up immediately when returning from the background.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [ended, paused]);

  const pause = () => setState((c) => pauseClock(c, Date.now()));
  const resume = () => {
    const at = Date.now();
    setState((c) => resumeClock(c, at));
    setNow(at);
  };

  return {
    t,
    readAt: now,
    paused,
    state,
    pause,
    resume,
    toggle: () => (paused ? resume() : pause()),
    seek: (targetMs) => {
      const at = Date.now();
      setState((c) => seekClock(c, at, targetMs));
      setNow(at);
    },
  };
}
