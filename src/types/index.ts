import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/** Any MaterialCommunityIcons glyph name. All icons in the app use this set. */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type HabitKind =
  | 'smoking'
  | 'vaping'
  | 'alcohol'
  | 'pornography'
  | 'sugar'
  | 'junk_food'
  | 'caffeine'
  | 'gambling'
  | 'gaming'
  | 'social_media'
  | 'procrastination'
  | 'overeating'
  | 'custom';

export type TriggerId =
  | 'stress'
  | 'boredom'
  | 'loneliness'
  | 'social'
  | 'emotions'
  | 'habit_loop'
  | 'fatigue'
  | 'celebration'
  | 'conflict';

/** 1 = worst, 5 = best. Rendered as weather icons (storm → star). */
export type MoodId = 'stormy' | 'cloudy' | 'sunny' | 'sparkle' | 'star';

export type ExerciseId =
  | 'breathing_478'
  | 'box_breathing'
  | 'wait_it_out'
  | 'grounding_54321'
  | 'body_scan'
  | 'meditation_1min'
  | 'cold_water'
  | 'play_tape_forward';

export interface Habit {
  id: string;
  kind: HabitKind;
  name: string;
  /** Hex accent color (one of theme.habitColors values). */
  color: string;
  icon: IconName;
  /** Epoch ms when the current clean streak started (quit date, or last relapse). */
  startedAt: number;
  /** Epoch ms of the very first quit date for this habit (never changes on relapse). */
  firstStartedAt: number;
  createdAt: number;
  /** Money the user used to spend on this habit per day, in `currency`. 0 = not tracked. */
  dailyCost: number;
  /** ISO 4217 code, e.g. "USD". Each habit can use its own currency. */
  currency: string;
  /** Minutes per day the habit used to take. 0 = not tracked. */
  dailyMinutes: number;
  /** Optional user-defined target in days. null = auto (next standard milestone). */
  goalDays: number | null;
  /** Why the user wants to quit — shown in SOS and detail screens. */
  reason: string;
  archived: boolean;
  /** Sort order on the home screen (ascending). */
  order: number;
}

export interface Relapse {
  id: string;
  habitId: string;
  /** Epoch ms when the relapse happened. The new streak starts here. */
  at: number;
  /** Length (ms) of the streak this relapse ended. */
  streakMs: number;
  triggers: TriggerId[];
  mood: MoodId | null;
  note: string;
}

export interface JournalEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  body: string;
  mood: MoodId;
  /** Optional link to a habit. */
  habitId: string | null;
}

export interface SosSession {
  id: string;
  at: number;
  exerciseId: ExerciseId;
  /** Seconds actually spent in the exercise. */
  durationSec: number;
  completed: boolean;
  habitId: string | null;
  /** Craving intensity before (1–10), optional. */
  intensityBefore: number | null;
  /** Craving intensity after (1–10), optional. */
  intensityAfter: number | null;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface Settings {
  onboardingCompleted: boolean;
  userName: string;
  /** Default currency used when creating new habits. */
  defaultCurrency: string;
  appLockEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: ReminderTime;
  milestoneNotificationsEnabled: boolean;
  hapticsEnabled: boolean;
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn: 0 | 1;
}

export interface Unlocks {
  /** achievementId -> epoch ms when unlocked */
  achievements: Record<string, number>;
  /** certificate key `${habitId}:${days}` -> epoch ms when claimed */
  certificates: Record<string, number>;
  /** milestone key `${habitId}:${startedAt}:${days}` -> true once celebrated */
  celebrated: Record<string, true>;
}

export interface PersistedState {
  version: number;
  habits: Habit[];
  relapses: Relapse[];
  journal: JournalEntry[];
  sosSessions: SosSession[];
  settings: Settings;
  unlocks: Unlocks;
}
