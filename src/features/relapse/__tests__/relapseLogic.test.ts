import { DAY, HOUR, MINUTE } from '@/domain/time';
import type { Habit, Relapse } from '@/types';
import {
  SUPPORT_QUOTES,
  canBackdate,
  doneTitle,
  durationPhrase,
  isNowPick,
  pickQuote,
  previewLines,
  recordLine,
  relapseMinAt,
  relapseOutcome,
  resolveRelapseAt,
  restartPhrase,
  savedLine,
  streakAdjective,
  toggleInOrder,
  undoTargetId,
} from '../relapseLogic';

const NOW = new Date(2026, 9, 9, 15, 30, 0).getTime();

function habit(partial: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    kind: 'caffeine',
    name: 'Coffee',
    color: '#B45309',
    icon: 'coffee',
    startedAt: NOW - 29 * DAY - 3 * HOUR,
    firstStartedAt: NOW - 100 * DAY,
    createdAt: NOW - 100 * DAY,
    dailyCost: 4,
    currency: 'USD',
    dailyMinutes: 15,
    goalDays: null,
    reason: '',
    archived: false,
    order: 0,
    ...partial,
  };
}

function relapse(id: string, streakMs: number, habitId = 'h1'): Relapse {
  return { id, habitId, at: NOW - 40 * DAY, streakMs, triggers: [], mood: null, note: '' };
}

describe('relapseOutcome', () => {
  it('saves the current streak and keeps a longer past record', () => {
    const o = relapseOutcome(habit(), [relapse('a', 31 * DAY), relapse('b', 90 * DAY, 'other')], NOW, NOW);
    expect(o.endedMs).toBe(29 * DAY + 3 * HOUR);
    expect(o.recordAfterMs).toBe(31 * DAY);
    expect(o.recordBeforeMs).toBe(31 * DAY);
    expect(o.endedIsRecord).toBe(false);
    expect(o.nextAttempt).toBe(3);
    expect(o.restartAt).toBe(NOW);
  });

  it('makes the ended streak the record when it is the longest', () => {
    const o = relapseOutcome(habit(), [], NOW, NOW);
    expect(o.endedIsRecord).toBe(true);
    expect(o.recordAfterMs).toBe(o.endedMs);
    expect(o.nextAttempt).toBe(2);
  });

  it('shortens the ended streak for a backdated relapse', () => {
    const h = habit({ startedAt: NOW - 29 * DAY });
    const o = relapseOutcome(h, [], NOW - 10 * DAY, NOW);
    expect(o.endedMs).toBe(19 * DAY);
    expect(o.recordBeforeMs).toBe(29 * DAY);
    expect(o.recordAfterMs).toBe(19 * DAY);
    expect(o.restartAt).toBe(NOW - 10 * DAY);
  });

  it('never dates a relapse before the current streak started', () => {
    const h = habit({ startedAt: NOW - DAY });
    const o = relapseOutcome(h, [], NOW - 5 * DAY, NOW);
    expect(o.restartAt).toBe(h.startedAt);
    expect(o.endedMs).toBe(0);
    expect(o.endedIsRecord).toBe(false);
  });
});

describe('phrases', () => {
  it('describes durations', () => {
    expect(durationPhrase(31 * DAY + 5 * HOUR)).toBe('31 days');
    expect(durationPhrase(DAY)).toBe('1 day');
    expect(durationPhrase(5 * HOUR)).toBe('5 hours');
    expect(durationPhrase(HOUR)).toBe('1 hour');
    expect(durationPhrase(12 * MINUTE)).toBe('12 minutes');
    expect(durationPhrase(MINUTE)).toBe('1 minute');
    expect(durationPhrase(10_000)).toBe('under a minute');
    expect(durationPhrase(1500 * DAY)).toBe('1,500 days');
  });

  it('builds compound adjectives', () => {
    expect(streakAdjective(29 * DAY + HOUR)).toBe('29-day');
    expect(streakAdjective(5 * HOUR)).toBe('5-hour');
    expect(streakAdjective(12 * MINUTE)).toBe('12-minute');
  });

  it('says when the new attempt starts', () => {
    expect(restartPhrase(NOW - MINUTE, NOW)).toBe('starts now');
    expect(restartPhrase(NOW - 3 * HOUR, NOW)).toBe('starts from today, 12:30');
    expect(restartPhrase(NOW - DAY, NOW)).toBe('starts from yesterday, 15:30');
    expect(restartPhrase(new Date(2026, 9, 3, 9, 5).getTime(), NOW)).toBe('starts from 3 Oct, 09:05');
    expect(restartPhrase(new Date(2026, 8, 10, 17, 23).getTime(), NOW)).toBe('starts from 10 Sep, 17:23');
    expect(restartPhrase(new Date(2025, 11, 28, 9, 0).getTime(), NOW)).toBe('starts from 28 Dec 2025, 09:00');
  });
});

describe('previewLines', () => {
  it('matches the original copy', () => {
    const o = relapseOutcome(habit(), [relapse('a', 31 * DAY)], NOW, NOW);
    expect(previewLines(o, NOW).map((l) => l.text)).toEqual(['Your 29-day streak will be saved.', 'Record: 31 days.', 'Attempt 3 starts now.']);
    expect(previewLines(o, NOW).map((l) => l.kind)).toEqual(['saved', 'record', 'attempt']);
  });

  it('celebrates a record that is kept', () => {
    const o = relapseOutcome(habit(), [relapse('a', 3 * DAY)], NOW, NOW);
    expect(previewLines(o, NOW)[1].text).toBe('It stays your record: 29 days.');
  });

  it('does not claim the record stays when backdating shortens it', () => {
    const o = relapseOutcome(habit({ startedAt: NOW - 29 * DAY }), [], NOW - DAY, NOW);
    expect(previewLines(o, NOW)[1].text).toBe('Record: 28 days.');
  });

  it('handles a streak that only just started', () => {
    const h = habit({ startedAt: NOW - 10_000 });
    const o = relapseOutcome(h, [], NOW, NOW);
    expect(previewLines(o, NOW).map((l) => l.text)).toEqual(['Your streak had only just started, so nothing is lost.', 'Attempt 2 starts now.']);
  });
});

describe('recordLine', () => {
  it('reassures that the record stays', () => {
    const o = relapseOutcome(habit(), [relapse('a', 31 * DAY)], NOW, NOW);
    expect(recordLine(o)).toBe('Your record stays 31 days');
  });

  it('explains a shortened record after backdating', () => {
    const o = relapseOutcome(habit({ startedAt: NOW - 29 * DAY }), [], NOW - 10 * DAY, NOW);
    expect(recordLine(o)).toBe('Your record is now 19 days');
  });

  it('has a gentle line when there is no record yet', () => {
    const o = relapseOutcome(habit({ startedAt: NOW }), [], NOW, NOW);
    expect(recordLine(o)).toBe('Your first record is waiting for you');
  });
});

describe('pickQuote', () => {
  it('is deterministic and always in range', () => {
    expect(pickQuote(3)).toBe(pickQuote(3));
    expect(pickQuote(SUPPORT_QUOTES.length)).toBe(SUPPORT_QUOTES[0]);
    expect(pickQuote(-1)).toBe(SUPPORT_QUOTES[1]);
    expect(pickQuote(123456789.7)).toBeDefined();
    expect(SUPPORT_QUOTES.every((q) => q.text.length > 0)).toBe(true);
  });
});

describe('toggleInOrder', () => {
  const all = ['a', 'b', 'c', 'd'] as const;
  it('adds and removes while keeping catalog order', () => {
    expect(toggleInOrder<string>([], 'c', all)).toEqual(['c']);
    expect(toggleInOrder<string>(['c'], 'a', all)).toEqual(['a', 'c']);
    expect(toggleInOrder<string>(['a', 'c'], 'a', all)).toEqual(['c']);
  });
});

describe('success copy', () => {
  it('titles the new attempt', () => {
    const o = relapseOutcome(habit(), [], NOW, NOW);
    expect(doneTitle(o, NOW)).toBe('Attempt 2 starts now');
    expect(doneTitle(o, NOW + 5 * MINUTE)).toBe('Attempt 2 has begun');
    const back = relapseOutcome(habit(), [relapse('a', DAY)], NOW - 3 * DAY, NOW);
    expect(doneTitle(back, NOW)).toBe('Attempt 3 has begun');
  });

  it('confirms the saved streak', () => {
    expect(savedLine(relapseOutcome(habit(), [], NOW, NOW))).toBe('Your 29-day streak is saved in your history.');
    expect(savedLine(relapseOutcome(habit({ startedAt: NOW - 1000 }), [], NOW, NOW))).toBe('Your history is up to date.');
  });
});

describe('relapse time', () => {
  const start = NOW - 20 * HOUR;

  it('never lets a relapse share the streak start', () => {
    expect(relapseMinAt(start, NOW)).toBe(start + MINUTE);
    // Picked exactly at the start (the sheet minimum before the fix) is moved past it.
    expect(resolveRelapseAt(start, start, NOW)).toBeGreaterThan(start);
    expect(resolveRelapseAt(start - DAY, start, NOW)).toBeGreaterThan(start);
  });

  it('keeps a valid backdated pick and caps future picks at now', () => {
    expect(resolveRelapseAt(NOW - 3 * HOUR, start, NOW)).toBe(NOW - 3 * HOUR);
    expect(resolveRelapseAt(NOW + HOUR, start, NOW)).toBe(NOW);
    expect(resolveRelapseAt(null, start, NOW)).toBe(NOW);
  });

  it('uses now for a streak younger than a minute', () => {
    const fresh = NOW - 20_000;
    expect(canBackdate(fresh, NOW)).toBe(false);
    expect(relapseMinAt(fresh, NOW)).toBe(NOW);
    expect(resolveRelapseAt(fresh, fresh, NOW)).toBe(NOW);
    // Same millisecond as the restart: still strictly after it.
    expect(resolveRelapseAt(null, NOW, NOW)).toBe(NOW + 1);
  });

  it('treats a pick within the tolerance as "now"', () => {
    expect(isNowPick(NOW - 30_000, NOW)).toBe(true);
    expect(isNowPick(NOW - 3 * MINUTE, NOW)).toBe(false);
  });
});

describe('undoTargetId', () => {
  const r = (id: string, at: number, habitId = 'h1'): Relapse => ({ id, habitId, at, streakMs: 0, triggers: [], mood: null, note: '' });

  it('picks the latest relapse of the habit', () => {
    expect(undoTargetId([r('a', 1), r('b', 3), r('c', 2), r('x', 9, 'other')], 'h1')).toBe('b');
    expect(undoTargetId([r('x', 9, 'other')], 'h1')).toBeNull();
  });

  it('mirrors the store on a tie (first stored wins)', () => {
    expect(undoTargetId([r('old', 5), r('new', 5)], 'h1')).toBe('old');
  });
});
