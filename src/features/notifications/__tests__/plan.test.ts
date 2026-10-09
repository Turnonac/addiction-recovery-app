import { DAY, HOUR } from '@/domain/time';
import type { Habit } from '@/types';
import {
  DAILY_COPY,
  DAILY_REMINDER_ID,
  dailyCopy,
  dailyReminders,
  MAX_SCHEDULED,
  milestoneBody,
  milestoneTitle,
  planNotifications,
  planSignature,
  type NotificationSettings,
} from '../plan';

const NOW = new Date(2026, 9, 9, 12, 0).getTime();

function habit(id: string, streakDays: number, extra: Partial<Habit> = {}): Habit {
  const startedAt = NOW - streakDays * DAY - 2 * HOUR;
  return {
    id,
    kind: 'smoking',
    name: 'Smoking',
    color: '#EF4444',
    icon: 'smoking',
    startedAt,
    firstStartedAt: startedAt,
    createdAt: startedAt,
    dailyCost: 0,
    currency: 'USD',
    dailyMinutes: 0,
    goalDays: null,
    reason: '',
    archived: false,
    order: 0,
    ...extra,
  };
}

const settings: NotificationSettings = {
  dailyReminderEnabled: true,
  dailyReminderTime: { hour: 9, minute: 30 },
  milestoneNotificationsEnabled: true,
  userName: '',
};

describe('planNotifications', () => {
  it('returns nothing when everything is off', () => {
    expect(planNotifications([habit('a', 3)], { ...settings, dailyReminderEnabled: false, milestoneNotificationsEnabled: false }, NOW)).toEqual([]);
  });

  it('schedules the daily reminder as one weekly repeat per weekday at the chosen time', () => {
    const plan = planNotifications([], settings, NOW);
    expect(plan).toHaveLength(7);
    expect(new Set(plan.map((p) => p.id)).size).toBe(7);
    for (const p of plan) {
      expect(p.id.startsWith(`${DAILY_REMINDER_ID}:`)).toBe(true);
      expect(p.trigger).toMatchObject({ type: 'weekly', hour: 9, minute: 30 });
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.url).toBe('/');
    }
    const weekdays = plan.map((p) => (p.trigger.type === 'weekly' ? p.trigger.weekday : 0));
    expect([...weekdays].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('schedules the next milestone per active habit at startedAt + days', () => {
    const h = habit('a', 29, { name: 'Smoking' });
    const plan = planNotifications([h], { ...settings, dailyReminderEnabled: false }, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      id: 'milestone:a:30',
      title: '🎉 1 month free from Smoking',
      trigger: { type: 'date', date: h.startedAt + 30 * DAY },
      url: '/habit/a',
    });
  });

  it('uses "1 week" wording and skips archived habits', () => {
    const plan = planNotifications(
      [habit('a', 3, { name: 'Alcohol' }), habit('b', 3, { archived: true })],
      { ...settings, dailyReminderEnabled: false },
      NOW,
    );
    expect(plan.map((p) => p.title)).toEqual(['🎉 1 week free from Alcohol']);
  });

  it('adds a custom goal that is not a standard milestone', () => {
    const h = habit('a', 10, { goalDays: 45 });
    const plan = planNotifications([h], { ...settings, dailyReminderEnabled: false }, NOW);
    expect(plan.map((p) => p.id)).toEqual(['milestone:a:14', 'goal:a:45']);
    expect(plan[1].title).toBe('🎯 Goal reached: 45 days free from Smoking');
  });

  it('does not duplicate goals that are standard milestones or already reached', () => {
    expect(planNotifications([habit('a', 10, { goalDays: 30 })], { ...settings, dailyReminderEnabled: false }, NOW).map((p) => p.id)).toEqual(['milestone:a:14']);
    expect(planNotifications([habit('a', 50, { goalDays: 45 })], { ...settings, dailyReminderEnabled: false }, NOW).map((p) => p.id)).toEqual(['milestone:a:60']);
  });

  it('skips milestones in the past (habit starting in the future still gets day 1)', () => {
    const future = habit('a', 0, { startedAt: NOW + HOUR });
    const plan = planNotifications([future], { ...settings, dailyReminderEnabled: false }, NOW);
    expect(plan[0].trigger).toEqual({ type: 'date', date: NOW + HOUR + DAY });
    for (const p of planNotifications([habit('x', 400), habit('y', 0)], settings, NOW)) {
      if (p.trigger.type === 'date') expect(p.trigger.date).toBeGreaterThan(NOW);
    }
  });

  it('orders dated notifications soonest first, after the daily reminders', () => {
    const plan = planNotifications([habit('slow', 100), habit('fast', 2)], settings, NOW);
    expect(plan.slice(7).map((p) => p.id)).toEqual(['milestone:fast:3', 'milestone:slow:180']);
    expect(plan.slice(0, 7).every((p) => p.trigger.type === 'weekly')).toBe(true);
  });

  it('caps the number of scheduled notifications', () => {
    const many = Array.from({ length: 80 }, (_, i) => habit(`h${i}`, i % 20, { goalDays: 1000 + i }));
    expect(planNotifications(many, settings, NOW)).toHaveLength(MAX_SCHEDULED);
  });
});

describe('dailyReminders', () => {
  // NOW is Friday 9 Oct 2026, 12:00 local time.
  it('rotates the copy every day of the week, matching dailyCopy for that day', () => {
    const list = dailyReminders({ hour: 20, minute: 0 }, '', NOW);
    expect(new Set(list.map((p) => p.body)).size).toBe(7);
    list.forEach((p, i) => {
      const day = new Date(2026, 9, 9 + i).getTime();
      expect(p.trigger).toEqual({ type: 'weekly', weekday: new Date(day).getDay() + 1, hour: 20, minute: 0 });
      expect({ title: p.title, body: p.body }).toEqual(dailyCopy(day));
    });
  });

  it('starts today when the time is still ahead, tomorrow when it has passed', () => {
    expect(dailyReminders({ hour: 20, minute: 0 }, '', NOW)[0]).toMatchObject({ id: 'daily-reminder:fri', trigger: { weekday: 6 } });
    expect(dailyReminders({ hour: 12, minute: 0 }, '', NOW)[0]).toMatchObject({ id: 'daily-reminder:sat', trigger: { weekday: 7 } });
    expect(dailyReminders({ hour: 9, minute: 30 }, '', NOW).map((p) => p.id)).toEqual(
      ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'].map((d) => `${DAILY_REMINDER_ID}:${d}`),
    );
  });

  it('is stable across re-syncs on different days (same copy per weekday)', () => {
    const byId = (now: number) => Object.fromEntries(dailyReminders({ hour: 9, minute: 0 }, 'Alex', now).map((p) => [p.id, p.title + p.body]));
    expect(byId(NOW + 3 * DAY)).toEqual(byId(NOW));
    expect(Object.values(byId(NOW)).some((t) => t.includes('Alex'))).toBe(true);
  });
});

describe('copy helpers', () => {
  it('rotates daily copy deterministically, one per day', () => {
    const a = dailyCopy(NOW);
    expect(dailyCopy(NOW + HOUR)).toEqual(a);
    const week = Array.from({ length: DAILY_COPY.length }, (_, i) => dailyCopy(NOW + i * DAY).body);
    expect(new Set(week).size).toBe(DAILY_COPY.length);
  });

  it('personalizes the first variant with the user name', () => {
    let ts = NOW;
    while (dailyCopy(ts).title !== DAILY_COPY[0].title) ts += DAY;
    expect(dailyCopy(ts, 'Alex').title).toBe('How are you today, Alex?');
  });

  it('writes milestone titles and bodies', () => {
    expect(milestoneTitle(7, 'Smoking')).toBe('🎉 1 week free from Smoking');
    expect(milestoneTitle(1, 'Coffee')).toBe('🎉 1 day free from Coffee');
    expect(milestoneBody(365)).toMatch(/full year/);
    expect(milestoneBody(730)).toMatch(/Another year/);
    expect(milestoneBody(45)).toMatch(/milestone/);
  });

  it('changes the signature when relevant inputs change', () => {
    const h = habit('a', 3);
    const base = planSignature([h], settings);
    expect(planSignature([{ ...h, startedAt: h.startedAt + 1 }], settings)).not.toBe(base);
    expect(planSignature([h], { ...settings, dailyReminderTime: { hour: 10, minute: 30 } })).not.toBe(base);
    expect(planSignature([h, { ...h, id: 'b', archived: true }], settings)).toBe(base);
  });
});
