import type { Habit, Relapse } from '@/types';
import { attemptNumber, recordStreakMs, snapshot, totalCleanMs } from '../habitStats';
import { DAY } from '../time';

const now = Date.UTC(2026, 9, 9, 12);

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  kind: 'smoking',
  name: 'Smoking',
  color: '#EF4444',
  icon: 'smoking',
  startedAt: now - 10 * DAY,
  firstStartedAt: now - 40 * DAY,
  createdAt: now - 40 * DAY,
  dailyCost: 10,
  currency: 'USD',
  dailyMinutes: 60,
  goalDays: null,
  reason: '',
  archived: false,
  order: 0,
  ...over,
});

const relapse = (at: number, streakDays: number): Relapse => ({ id: `r${at}`, habitId: 'h1', at, streakMs: streakDays * DAY, triggers: [], mood: null, note: '' });

describe('habitStats', () => {
  const rs = [relapse(now - 30 * DAY, 10), relapse(now - 10 * DAY, 20)];

  it('counts attempts', () => {
    expect(attemptNumber([])).toBe(1);
    expect(attemptNumber(rs)).toBe(3);
  });

  it('computes record and total clean time', () => {
    expect(recordStreakMs(habit(), rs, now)).toBe(20 * DAY);
    expect(totalCleanMs(habit(), rs, now)).toBe(40 * DAY);
  });

  it('builds a snapshot', () => {
    const s = snapshot(habit(), rs, now);
    expect(s.streakDays).toBe(10);
    expect(s.attempt).toBe(3);
    expect(s.recordDays).toBe(20);
    expect(s.totalCleanDays).toBe(40);
    expect(s.goalDays).toBe(14);
    expect(s.moneySaved).toBeCloseTo(400);
    expect(s.minutesSaved).toBeCloseTo(2400);
    expect(s.isRecord).toBe(false);
  });

  it('ignores other habits relapses', () => {
    const s = snapshot(habit(), [...rs, { ...relapse(now - DAY, 5), habitId: 'other' }], now);
    expect(s.attempt).toBe(3);
  });
});
