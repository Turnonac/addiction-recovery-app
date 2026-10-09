import type { ExerciseId, IconName } from '@/types';

export interface ExerciseDef {
  id: ExerciseId;
  title: string;
  /** One-line benefit shown in the picker. */
  subtitle: string;
  icon: IconName;
  color: string;
  /** Planned length of the guided session, in seconds. */
  durationSec: number;
}

/** SOS exercises, in picker order (matches the original "Choose exercise" list). */
export const EXERCISES: ExerciseDef[] = [
  {
    id: 'breathing_478',
    title: '4-7-8 Breathing',
    subtitle: 'Calms the nervous system and relieves anxiety in minutes.',
    icon: 'weather-windy',
    color: '#3B82F6',
    durationSec: 4 * 19,
  },
  {
    id: 'box_breathing',
    title: 'Box Breathing',
    subtitle: 'Resets focus and clears mental fog instantly.',
    icon: 'square-rounded-outline',
    color: '#8B5CF6',
    durationSec: 4 * 16,
  },
  {
    id: 'wait_it_out',
    title: 'Wait It Out',
    subtitle: "10 minutes of waiting. The craving will fade on its own — you don't have to act.",
    icon: 'waves',
    color: '#06B6D4',
    durationSec: 10 * 60,
  },
  {
    id: 'grounding_54321',
    title: '5-4-3-2-1 Grounding',
    subtitle: 'Anchors you to the present moment and stops panic spirals.',
    icon: 'leaf',
    color: '#22C55E',
    durationSec: 3 * 60,
  },
  {
    id: 'body_scan',
    title: 'Body Scan',
    subtitle: 'Release tension stored in your body — 3 minutes of gentle awareness.',
    icon: 'meditation',
    color: '#F59E0B',
    durationSec: 3 * 60,
  },
  {
    id: 'meditation_1min',
    title: '1-Minute Meditation',
    subtitle: 'Lowers cortisol and brings your body back to a calm state.',
    icon: 'head-heart-outline',
    color: '#EC4899',
    durationSec: 60,
  },
  {
    id: 'cold_water',
    title: 'Cold Water Reset',
    subtitle: 'Activates the dive reflex — slows your heart rate in seconds.',
    icon: 'water',
    color: '#14B8A6',
    durationSec: 90,
  },
  {
    id: 'play_tape_forward',
    title: 'Play the Tape Forward',
    subtitle: 'Picture how you will feel an hour after giving in — and after not.',
    icon: 'movie-open-outline',
    color: '#F43F5E',
    durationSec: 2 * 60,
  },
];

export function exerciseFor(id: ExerciseId): ExerciseDef {
  return EXERCISES.find((e) => e.id === id) ?? EXERCISES[0];
}
