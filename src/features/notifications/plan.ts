import { MILESTONE_DAYS, milestoneAfter, milestoneLabel } from '@/domain/milestones';
import { addDays, DAY, startOfDay, wholeDays } from '@/domain/time';
import type { Habit, Settings } from '@/types';
import { pluralDays } from '@/utils/format';

/**
 * Platform-neutral trigger; NotificationsSync maps it to expo-notifications inputs.
 * `weekday` follows expo-notifications: 1 = Sunday … 7 = Saturday.
 */
export type PlannedTrigger = { type: 'weekly'; weekday: number; hour: number; minute: number } | { type: 'date'; date: number };

export interface PlannedNotification {
  id: string;
  title: string;
  body: string;
  trigger: PlannedTrigger;
  /** Deep link opened when the notification is tapped. */
  url: string;
}

export type NotificationSettings = Pick<Settings, 'dailyReminderEnabled' | 'dailyReminderTime' | 'milestoneNotificationsEnabled' | 'userName'>;

/** Id prefix of the daily check-in notifications (`daily-reminder:mon` …). */
export const DAILY_REMINDER_ID = 'daily-reminder';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** iOS keeps at most 64 pending local notifications per app. */
export const MAX_SCHEDULED = 60;

interface Copy {
  title: string;
  body: string;
}

/**
 * Rotating daily check-in copy, one per weekday (exactly 7). Supportive, never
 * guilt-tripping, no numbers (each text is fixed once scheduled).
 */
export const DAILY_COPY: Copy[] = [
  { title: 'How are you today?', body: 'Take a moment to check in with yourself. Every clean day counts.' },
  { title: 'One day at a time', body: 'You’ve already come this far. Keep the streak going today.' },
  { title: 'Quick check-in', body: 'Noticed any cravings today? Log how you feel — it helps you spot your triggers.' },
  { title: 'Small wins add up', body: 'Open Quit and see how far you’ve come. You should be proud.' },
  { title: 'Feeling a craving?', body: 'A one-minute breathing exercise in SOS can help it pass.' },
  { title: 'Stay the course', body: 'Your future self will thank you for today.' },
  { title: 'A moment for you', body: 'Write a few lines in your journal. Putting it into words makes it lighter.' },
];

/** Deterministic copy for the day containing `now` (changes daily, stable within a day). */
export function dailyCopy(now: number, userName: string = ''): Copy {
  const dayIndex = Math.floor(startOfDay(now) / DAY + 0.5);
  const copy = DAILY_COPY[((dayIndex % DAILY_COPY.length) + DAILY_COPY.length) % DAILY_COPY.length];
  const name = userName.trim();
  if (copy === DAILY_COPY[0] && name) return { ...copy, title: `How are you today, ${name}?` };
  return copy;
}

const MILESTONE_BODIES: Record<number, string> = {
  1: 'The first day is the hardest — and you did it. Be proud of yourself.',
  3: 'Three days in. The toughest cravings are usually behind you now.',
  7: 'A whole week! Your body is already starting to recover.',
  14: 'Two weeks strong. Your new habits are taking root.',
  30: 'One month free. That’s a huge achievement — take a moment to celebrate.',
  60: 'Two months! You’re proving to yourself that change is possible.',
  90: 'Three months. You’ve rebuilt your routine — keep going.',
  180: 'Half a year free. That takes real dedication.',
};

export function milestoneBody(days: number): string {
  if (MILESTONE_BODIES[days]) return MILESTONE_BODIES[days];
  if (days % 365 === 0) return days === 365 ? 'A full year! You’ve truly broken free.' : 'Another year of freedom. You’re an inspiration.';
  return 'Another milestone reached. Open Quit to celebrate your progress.';
}

/** "🎉 1 week free from Smoking" */
export function milestoneTitle(days: number, habitName: string): string {
  return `🎉 ${milestoneLabel(days)} free from ${habitName}`;
}

/**
 * The daily check-in as seven weekly repeating notifications, one per weekday,
 * each carrying that day's copy. A single DAILY trigger would repeat the same
 * text until the app is opened again; this way the message rotates every day
 * without the app being opened, and never runs out. Soonest first.
 */
export function dailyReminders(time: Settings['dailyReminderTime'], userName: string, now: number): PlannedNotification[] {
  const { hour, minute } = time;
  const today = startOfDay(now);
  const n = new Date(now);
  // Today's reminder already went off → the next one is tomorrow's.
  const first = n.getHours() * 60 + n.getMinutes() >= hour * 60 + minute ? 1 : 0;
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, first + i);
    const weekday = new Date(day).getDay();
    return {
      id: `${DAILY_REMINDER_ID}:${WEEKDAY_KEYS[weekday]}`,
      ...dailyCopy(day, userName),
      trigger: { type: 'weekly', weekday: weekday + 1, hour, minute },
      url: '/',
    };
  });
}

/**
 * Everything that should be scheduled right now, soonest first. Pure: the caller
 * cancels all pending notifications and schedules exactly this list.
 * - Daily check-in at the chosen time (see `dailyReminders`) when enabled.
 * - For each active habit, its next streak milestone (and a custom goal, if set
 *   and not itself a standard milestone), at startedAt + days. Past dates are skipped.
 */
export function planNotifications(habits: readonly Habit[], settings: NotificationSettings, now: number): PlannedNotification[] {
  const out: PlannedNotification[] = [];

  if (settings.dailyReminderEnabled) {
    out.push(...dailyReminders(settings.dailyReminderTime, settings.userName, now));
  }

  if (settings.milestoneNotificationsEnabled) {
    const dated: PlannedNotification[] = [];
    for (const habit of habits) {
      if (habit.archived) continue;
      const streakDays = wholeDays(now - habit.startedAt);
      const next = milestoneAfter(streakDays);
      const nextAt = habit.startedAt + next * DAY;
      if (nextAt > now) {
        dated.push({
          id: `milestone:${habit.id}:${next}`,
          title: milestoneTitle(next, habit.name),
          body: milestoneBody(next),
          trigger: { type: 'date', date: nextAt },
          url: `/habit/${habit.id}`,
        });
      }
      const goal = habit.goalDays;
      const isStandard = goal != null && ((MILESTONE_DAYS as readonly number[]).includes(goal) || goal % 365 === 0);
      if (goal != null && goal > streakDays && goal !== next && !isStandard) {
        const goalAt = habit.startedAt + goal * DAY;
        if (goalAt > now) {
          dated.push({
            id: `goal:${habit.id}:${goal}`,
            title: `🎯 Goal reached: ${pluralDays(goal)} free from ${habit.name}`,
            body: 'You set this goal and you made it. Time to set the next one.',
            trigger: { type: 'date', date: goalAt },
            url: `/habit/${habit.id}`,
          });
        }
      }
    }
    dated.sort((a, b) => (a.trigger.type === 'date' && b.trigger.type === 'date' ? a.trigger.date - b.trigger.date : 0));
    out.push(...dated);
  }

  return out.slice(0, MAX_SCHEDULED);
}

/** Compact string of every input that affects the plan (used as an effect dependency). */
export function planSignature(habits: readonly Habit[], settings: NotificationSettings): string {
  const t = settings.dailyReminderTime;
  const head = `${settings.dailyReminderEnabled ? 1 : 0}${settings.milestoneNotificationsEnabled ? 1 : 0}@${t.hour}:${t.minute}#${settings.userName}`;
  return [head, ...habits.filter((h) => !h.archived).map((h) => `${h.id}:${h.startedAt}:${h.goalDays ?? ''}:${h.name}`)].join('|');
}
