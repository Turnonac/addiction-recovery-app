import { router, useNavigation, useRoute } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState, type ComponentType } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Header, Screen } from '@/components';
import type { ExerciseDef } from '@/domain/catalog/exercises';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { spacing } from '@/theme';
import type { ExerciseId, Habit } from '@/types';
import { confirm } from '@/utils/confirm';
import { BodyScan } from '../exercises/BodyScan';
import { BoxBreathing } from '../exercises/BoxBreathing';
import { Breathing478 } from '../exercises/Breathing478';
import { ColdWater } from '../exercises/ColdWater';
import { Grounding } from '../exercises/Grounding';
import { Meditation } from '../exercises/Meditation';
import { TapeForward } from '../exercises/TapeForward';
import { WaitItOut } from '../exercises/WaitItOut';
import { sessionSeconds } from '../logic/clock';
import {
  HOME_ROUTE_NAME,
  PICKER_ROUTE_NAME,
  buildSession,
  clampIntensity,
  hasRoute,
  intensityParam,
  pickerHref,
  previousRoute,
} from '../logic/session';
import { exerciseTimelineMs } from '../logic/timeline';
import { useExerciseClock } from '../useExerciseClock';
import { CompletionView } from './CompletionView';
import { RunnerControls } from './RunnerControls';
import { amendSosSession } from './sessionLog';
import type { ExerciseViewProps } from './types';

/** Header titles that fit the centered header on 360dp phones (the catalog title is used otherwise). */
const SHORT_TITLES: Partial<Record<ExerciseId, string>> = {
  grounding_54321: 'Grounding',
  meditation_1min: 'Meditation',
  play_tape_forward: 'Tape Forward',
};

const VIEWS: Record<ExerciseId, ComponentType<ExerciseViewProps>> = {
  breathing_478: Breathing478,
  box_breathing: BoxBreathing,
  wait_it_out: WaitItOut,
  grounding_54321: Grounding,
  body_scan: BodyScan,
  meditation_1min: Meditation,
  cold_water: ColdWater,
  play_tape_forward: TapeForward,
};

interface Result {
  /** Ran the whole timeline / all steps (vs. finished early). */
  reachedEnd: boolean;
  durationSec: number;
}

export interface ExerciseRunnerProps {
  exercise: ExerciseDef;
  habit: Habit | null;
  /** Craving intensity picked before starting (1–10). */
  before: number | null;
}

type LeaveTarget = 'back' | 'exit' | 'picker';

/** The one session a run logs: its store id and what was saved with it. */
interface Logged {
  id: string;
  completed: boolean;
  after: number | null;
}

/**
 * Runs one SOS exercise: shared clock, controls, completion screen, and exactly-once
 * session logging. A finished session is saved as soon as the completion screen
 * appears (so it survives the app being killed there) and its after-rating is kept
 * up to date; a session left while running is saved as incomplete on every way out
 * (close ×, hardware back, swipe, browser back/forward).
 */
export function ExerciseRunner({ exercise, habit, before }: ExerciseRunnerProps) {
  const totalMs = exerciseTimelineMs(exercise.id);
  const [early, setEarly] = useState<Result | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  const clock = useExerciseClock({ stopped: early != null, limitMs: totalMs });
  const naturalEnd = early == null && totalMs != null && clock.t >= totalMs;
  const result: Result | null = early ?? (naturalEnd ? { reachedEnd: true, durationSec: sessionSeconds(clock.state, clock.readAt, totalMs) } : null);
  const done = result != null;

  const logSosSession = useStore((s) => s.logSosSession);
  const haptic = useHaptics();
  const navigation = useNavigation();
  const route = useRoute();
  const loggedRef = useRef<Logged | null>(null);
  /** Set once this run starts navigating away: every later exit request is ignored. */
  const leavingRef = useRef(false);
  /** An "End exercise?" dialog is open: don't stack a second one. */
  const askingRef = useRef(false);

  const log = (completed: boolean, durationSec: number, intensityAfter: number | null) => {
    if (loggedRef.current) return;
    const session = buildSession({
      exerciseId: exercise.id,
      durationSec,
      completed,
      habitId: habit?.id ?? null,
      intensityBefore: before,
      intensityAfter,
      at: clock.state.startedAt,
    });
    loggedRef.current = { id: logSosSession(session), completed, after: session.intensityAfter };
  };

  /** Saves the finished session (once) and brings its after-rating up to date. */
  const record = (r: Result, value: number | null) => {
    log(true, r.durationSec, value);
    const logged = loggedRef.current;
    const intensityAfter = clampIntensity(value);
    if (!logged?.completed || logged.after === intensityAfter) return;
    amendSosSession(logged.id, { intensityAfter });
    logged.after = intensityAfter;
  };

  const onFinished = useEffectEvent(() => {
    haptic('success');
    if (result) record(result, after);
  });
  useEffect(() => {
    if (done) onFinished();
  }, [done]);

  const changeAfter = (value: number | null) => {
    setAfter(value);
    if (result) record(result, value);
  };

  /**
   * Navigates away — at most once per run, so a double tap (two activations before the
   * transition covers the button) can't pop past where SOS was opened.
   */
  const leave = (to: LeaveTarget) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    const state = navigation.getState();
    const below = previousRoute(state);
    const fromPicker = below?.name === PICKER_ROUTE_NAME;
    if (to === 'picker') {
      if (fromPicker && below?.key) {
        // The picker below starts from the fresh rating and suggests a different exercise.
        const params = { before: intensityParam(after), last: exercise.id };
        navigation.dispatch({ type: 'SET_PARAMS', payload: { params }, source: below.key });
        router.back();
      } else {
        router.replace(pickerHref(habit?.id ?? null, after, exercise.id));
      }
      return;
    }
    if (to === 'exit' && fromPicker) {
      // Close the whole SOS flow (runner + picker) and land where SOS was opened.
      if ((state?.index ?? 0) >= 2) router.dismiss(2);
      // The picker is the root (deep link / web reload): nothing to go back to, so start
      // over from Home — leaving the picker underneath would let "back" reopen it.
      else navigation.dispatch({ type: 'RESET', payload: { index: 0, routes: [{ name: HOME_ROUTE_NAME }] } });
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  /** Saves the finished session (once) and leaves (once). */
  const finishAndLeave = (to: LeaveTarget) => {
    if (leavingRef.current) return;
    if (result) record(result, after);
    leave(to);
  };

  /** Confirms ending a running exercise; logs it as incomplete when confirmed. */
  const askToEnd = async (): Promise<boolean> => {
    if (askingRef.current || leavingRef.current) return false;
    askingRef.current = true;
    const seconds = sessionSeconds(clock.state, Date.now(), null);
    const wasPaused = clock.paused;
    if (!wasPaused) clock.pause();
    let ok = false;
    try {
      ok = await confirm({
        title: 'End exercise?',
        message: 'The urge may still be passing. The time you spent so far will be saved.',
        confirmLabel: 'End',
        cancelLabel: 'Keep going',
        destructive: true,
      });
    } finally {
      askingRef.current = false;
    }
    if (ok) log(false, seconds, null);
    else if (!wasPaused) clock.resume();
    return ok;
  };

  const finishWith = (reachedEnd: boolean) => {
    if (done) return;
    setEarly({ reachedEnd, durationSec: sessionSeconds(clock.state, Date.now(), null) });
  };

  const handleClose = async () => {
    if (result) {
      finishAndLeave('exit');
      return;
    }
    if (await askToEnd()) leave('back');
  };

  // Exits we don't initiate on native (Android back, swipe): confirm first while running.
  const onBeforeRemove = useEffectEvent((e: { preventDefault: () => void; data: { action: Parameters<typeof navigation.dispatch>[0] } }) => {
    if (leavingRef.current || loggedRef.current) return;
    if (result) {
      record(result, after);
      return;
    }
    e.preventDefault();
    void askToEnd().then((ok) => {
      if (!ok) return;
      leavingRef.current = true;
      navigation.dispatch(e.data.action);
    });
  });
  useEffect(() => navigation.addListener('beforeRemove', (e) => onBeforeRemove(e)), [navigation]);

  // Exits that skip `beforeRemove` — a browser back/forward on web pops history without
  // asking and can't be cancelled — still log: the result if finished, else incomplete.
  const onUnmount = useEffectEvent(() => {
    let state: Parameters<typeof hasRoute>[0];
    try {
      state = navigation.getState();
    } catch {
      state = undefined;
    }
    // Still in the stack → a remount (e.g. fast refresh), not an exit.
    if (hasRoute(state, route.key)) return;
    if (result) record(result, after);
    else log(false, sessionSeconds(clock.state, Date.now(), null), null);
  });
  useEffect(() => () => onUnmount(), []);

  const ExerciseView = VIEWS[exercise.id];
  const isWait = exercise.id === 'wait_it_out';

  return (
    <Screen
      glowColor={exercise.color}
      glowIntensity={0.45}
      scroll={false}
      keyboard
      header={<Header title={SHORT_TITLES[exercise.id] ?? exercise.title} left="close" onLeftPress={() => void handleClose()} />}
      testID={`sos-runner-${exercise.id}`}
    >
      {result ? (
        <CompletionView
          exercise={exercise}
          reachedEnd={result.reachedEnd}
          durationSec={result.durationSec}
          before={before}
          after={after}
          onChangeAfter={changeAfter}
          onDone={() => finishAndLeave('exit')}
          onTryAnother={() => finishAndLeave('picker')}
        />
      ) : (
        <>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={clock.paused ? styles.dimmed : undefined}>
              <ExerciseView
                exercise={exercise}
                t={clock.t}
                paused={clock.paused}
                habit={habit}
                onFinish={() => finishWith(true)}
                onSeek={clock.seek}
              />
            </View>
          </ScrollView>
          <RunnerControls
            t={clock.t}
            totalMs={totalMs}
            paused={clock.paused}
            color={exercise.color}
            onTogglePause={() => {
              haptic('light');
              clock.toggle();
            }}
            onFinishEarly={() => finishWith(false)}
            finishLabel={isWait ? 'I feel better' : 'Finish early'}
            finishProminent={isWait}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  dimmed: { opacity: 0.6 },
});
