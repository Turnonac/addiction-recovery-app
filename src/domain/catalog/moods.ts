import type { IconName, MoodId } from '@/types';

export interface MoodDef {
  id: MoodId;
  label: string;
  /** 1 (worst) .. 5 (best) */
  score: number;
  icon: IconName;
  color: string;
}

/** Ordered worst → best. Weather metaphors, like the original journal. */
export const MOODS: MoodDef[] = [
  { id: 'stormy', label: 'Stormy', score: 1, icon: 'weather-pouring', color: '#3B82F6' },
  { id: 'cloudy', label: 'Cloudy', score: 2, icon: 'weather-cloudy', color: '#94A3B8' },
  { id: 'sunny', label: 'Okay', score: 3, icon: 'white-balance-sunny', color: '#EAB308' },
  { id: 'sparkle', label: 'Good', score: 4, icon: 'creation', color: '#22C55E' },
  { id: 'star', label: 'Great', score: 5, icon: 'star', color: '#F97316' },
];

export function moodFor(id: MoodId): MoodDef {
  return MOODS.find((m) => m.id === id) ?? MOODS[2];
}
