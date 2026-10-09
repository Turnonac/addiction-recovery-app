import { evaluateAll } from '@/domain/achievements';
import { presetFor } from '@/domain/catalog/habits';
import { DEFAULT_SETTINGS, STATE_VERSION, celebrationKey } from '@/store';
import type { Habit, HabitKind, JournalEntry, PersistedState, Relapse, SosSession } from '@/types';
import { milestonesReachedList } from './milestones';
import { DAY, HOUR, MINUTE, wholeDays } from './time';

/**
 * Deterministic sample data so every screen has something to show. Used by
 * Settings → "Load sample data" and by automated screenshots.
 */
export function buildDemoState(now: number): PersistedState {
  const mk = (
    id: string,
    kind: HabitKind,
    order: number,
    streakDays: number,
    firstDaysAgo: number,
    dailyCost: number,
    currency: string,
    dailyMinutes: number,
    extra: Partial<Habit> = {},
  ): Habit => {
    const p = presetFor(kind);
    return {
      id,
      kind,
      name: p.name,
      color: p.color,
      icon: p.icon,
      startedAt: now - streakDays * DAY - 3 * HOUR - 17 * MINUTE,
      firstStartedAt: now - firstDaysAgo * DAY,
      createdAt: now - firstDaysAgo * DAY,
      dailyCost,
      currency,
      dailyMinutes,
      goalDays: null,
      reason: '',
      archived: false,
      order,
      ...extra,
    };
  };

  const habits: Habit[] = [
    mk('demo_smoking', 'smoking', 0, 29, 75, 9, 'UAH', 60, { dailyCost: 120, reason: 'I want to breathe freely and run with my kids.' }),
    mk('demo_alcohol', 'alcohol', 1, 30, 30, 12, 'EUR', 120, { reason: 'Clear mornings and better sleep.' }),
    mk('demo_coffee', 'caffeine', 2, 31, 31, 4, 'USD', 15),
    mk('demo_social', 'social_media', 3, 6, 40, 0, 'USD', 150),
  ];

  const r = (id: string, habitId: string, daysAgo: number, streakDays: number, triggers: Relapse['triggers'], mood: Relapse['mood'], note: string): Relapse => ({
    id,
    habitId,
    at: now - daysAgo * DAY,
    streakMs: streakDays * DAY,
    triggers,
    mood,
    note,
  });

  const smokingStart = habits[0].startedAt;
  const socialStart = habits[3].startedAt;
  const relapses: Relapse[] = [
    r('demo_r1', 'demo_smoking', 75 - 12, 12, ['stress', 'social'], 'stormy', 'Work deadline and a party on the same day.'),
    r('demo_r2', 'demo_smoking', 75 - 12 - 33 + 0, 33, ['social', 'habit_loop'], 'cloudy', 'Coffee break with colleagues who smoke.'),
    { ...r('demo_r3', 'demo_smoking', 0, 0, ['stress'], 'stormy', 'Bad news, bought a pack.'), at: smokingStart, streakMs: smokingStart - (now - (75 - 12 - 33) * DAY) },
    r('demo_r4', 'demo_social', 40 - 20, 20, ['boredom', 'fatigue'], 'cloudy', 'Doomscrolled in bed.'),
    { ...r('demo_r5', 'demo_social', 0, 0, ['loneliness', 'boredom'], 'cloudy', 'Sunday evening alone.'), at: socialStart, streakMs: socialStart - (now - 20 * DAY) },
  ];

  const j = (id: string, daysAgo: number, hour: number, minute: number, title: string, body: string, mood: JournalEntry['mood'], habitId: string | null): JournalEntry => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hour, minute, 0, 0);
    return { id, createdAt: d.getTime(), updatedAt: d.getTime(), title, body, mood, habitId };
  };

  const journal: JournalEntry[] = [
    j('demo_j1', 1, 14, 43, "The desire isn't as strong anymore", "It seems to be getting easier. I don't feel the same urge to do it as I used to. The SOS feature is a big help.", 'cloudy', 'demo_smoking'),
    j('demo_j2', 4, 1, 0, 'An interesting night', "It's tough, but I'm hanging in there.", 'sunny', null),
    j('demo_j3', 5, 14, 11, "I'm going for a walk", "I want to go for a walk so I don't lose my temper. Maybe I'll get to meet some interesting people.", 'sparkle', null),
    j('demo_j4', 5, 12, 48, "It's hard to hold on", "It's pretty tough, but I'm confident. I can do this!", 'sunny', 'demo_alcohol'),
    j('demo_j5', 30, 9, 20, 'I started smoking again', "I tried my best, but I couldn't do it. I'm sorry, but I'm going to start over. I can do it.", 'stormy', 'demo_smoking'),
    j('demo_j6', 45, 16, 10, "I haven't smoked in a long time", 'Two weeks without a cigarette. Food tastes better already.', 'star', 'demo_smoking'),
  ];

  const s = (id: string, daysAgo: number, exerciseId: SosSession['exerciseId'], durationSec: number, before: number, after: number, habitId: string | null): SosSession => ({
    id,
    at: now - daysAgo * DAY - 2 * HOUR,
    exerciseId,
    durationSec,
    completed: true,
    habitId,
    intensityBefore: before,
    intensityAfter: after,
  });

  const sosSessions: SosSession[] = [
    s('demo_s1', 2, 'breathing_478', 76, 8, 4, 'demo_smoking'),
    s('demo_s2', 6, 'wait_it_out', 600, 9, 3, 'demo_alcohol'),
    s('demo_s3', 12, 'grounding_54321', 180, 7, 3, 'demo_smoking'),
    s('demo_s4', 20, 'box_breathing', 64, 6, 3, null),
  ];

  // Sample data arrives "already lived": milestones count as celebrated and earned
  // achievements as unlocked, so loading it doesn't fire a burst of popups.
  const celebrated: Record<string, true> = {};
  for (const h of habits) {
    for (const m of milestonesReachedList(wholeDays(now - h.startedAt))) celebrated[celebrationKey(h.id, h.startedAt, m)] = true;
  }
  const achievements: Record<string, number> = {};
  for (const a of evaluateAll({ habits, relapses, journal, sosSessions, now })) {
    if (a.unlocked) achievements[a.def.id] = now - DAY;
  }

  return {
    version: STATE_VERSION,
    habits,
    relapses,
    journal,
    sosSessions,
    settings: { ...DEFAULT_SETTINGS, onboardingCompleted: true, userName: 'Alex', defaultCurrency: 'USD' },
    unlocks: {
      achievements,
      certificates: { 'demo_alcohol:7': now - 23 * DAY, 'demo_coffee:7': now - 24 * DAY, 'demo_coffee:30': now - 1 * DAY, 'demo_smoking:7': now - 22 * DAY },
      celebrated,
    },
  };
}
