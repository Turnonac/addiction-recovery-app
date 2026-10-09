import type { ExerciseDef } from '@/domain/catalog/exercises';
import type { Habit } from '@/types';

/** Props every exercise view receives from the runner. */
export interface ExerciseViewProps {
  exercise: ExerciseDef;
  /** Position on the exercise timeline in ms (pauses excluded, skips included). */
  t: number;
  paused: boolean;
  /** Habit the session is for, if any (used for the reason in "Play the tape forward"). */
  habit: Habit | null;
  /** User-paced exercises call this after their last step. */
  onFinish: () => void;
  /** Jump the timeline forward (e.g. "Next step"). */
  onSeek: (ms: number) => void;
}
