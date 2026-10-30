import { describe, expect, it, test } from '@jest/globals';

import { decideSetColor, lowestOf } from '@/domain/checkin';
import type { ColorLevel, DayLog, SetColorOutcome } from '@/domain/types';

const TODAY = '2026-10-29';
const YESTERDAY = '2026-10-28';
const GREEN = 0;
const BLUE = 1;
const YELLOW = 2;
const RED = 3;

const day = (date: string, color: ColorLevel | null, checkedIn = false): DayLog => ({ date, color, checkedIn });

const saved = (d: DayLog, becameRed: boolean): SetColorOutcome => ({
  kind: 'saved',
  day: d,
  becameRed,
});

describe('decideSetColor', () => {
  test.each<[string, DayLog | undefined, string, ColorLevel, { confirmBetter?: boolean }, SetColorOutcome]>([
    // future days are locked
    ['future day rejected', undefined, '2026-10-30', GREEN, {}, { kind: 'rejectedFuture' }],
    ['future day rejected even with an existing row', day('2026-11-02', BLUE), '2026-11-02', RED, {}, { kind: 'rejectedFuture' }],
    ['future day rejected even when confirming', undefined, '2026-10-30', GREEN, { confirmBetter: true }, { kind: 'rejectedFuture' }],

    // first color
    ['first color today', undefined, TODAY, YELLOW, {}, saved(day(TODAY, YELLOW), false)],
    ['first color can backfill a past day', undefined, '2026-10-01', BLUE, {}, saved(day('2026-10-01', BLUE), false)],
    ['first color Red becomes Red', undefined, TODAY, RED, {}, saved(day(TODAY, RED), true)],

    // previous color null (call marked before a color) keeps the check-in
    ['previous null keeps check-in', day(TODAY, null, true), TODAY, YELLOW, {}, saved(day(TODAY, YELLOW, true), false)],
    ['previous null + Red keeps check-in, becomes Red', day(TODAY, null, true), TODAY, RED, {}, saved(day(TODAY, RED, true), true)],

    // worse color replaces
    ['worse replaces better', day(TODAY, GREEN), TODAY, YELLOW, {}, saved(day(TODAY, YELLOW), false)],
    ['worse to Red becomes Red', day(TODAY, YELLOW), TODAY, RED, {}, saved(day(TODAY, RED), true)],
    ['worse on a past day', day(YESTERDAY, BLUE), YESTERDAY, YELLOW, {}, saved(day(YESTERDAY, YELLOW), false)],
    ['confirmBetter has no effect on a worse color', day(TODAY, GREEN), TODAY, BLUE, { confirmBetter: true }, saved(day(TODAY, BLUE), false)],

    // worse color after the call: the check-in stays (one call per day)
    ['worse on checked-in day keeps check-in', day(TODAY, BLUE, true), TODAY, YELLOW, {}, saved(day(TODAY, YELLOW, true), false)],
    ['Red on checked-in day keeps check-in and becomes Red', day(TODAY, GREEN, true), TODAY, RED, {}, saved(day(TODAY, RED, true), true)],
    ['worse on a checked-in past day keeps it', day(YESTERDAY, GREEN, true), YESTERDAY, BLUE, {}, saved(day(YESTERDAY, BLUE, true), false)],
    ['Red on a checked-in past day keeps it, becomes Red', day('2026-10-01', BLUE, true), '2026-10-01', RED, {}, saved(day('2026-10-01', RED, true), true)],

    // same color is a no-op save
    ['same color no-op', day(TODAY, YELLOW), TODAY, YELLOW, {}, saved(day(TODAY, YELLOW), false)],
    ['same color keeps check-in', day(TODAY, BLUE, true), TODAY, BLUE, {}, saved(day(TODAY, BLUE, true), false)],
    ['Red again is not becameRed', day(TODAY, RED), TODAY, RED, {}, saved(day(TODAY, RED), false)],

    // better color needs confirmation
    ['better needs confirm', day(TODAY, YELLOW), TODAY, GREEN, {}, { kind: 'needsConfirmBetter', current: YELLOW, requested: GREEN }],
    ['better needs confirm (confirmBetter false)', day(TODAY, RED), TODAY, BLUE, { confirmBetter: false }, { kind: 'needsConfirmBetter', current: RED, requested: BLUE }],
    ['better confirmed saves', day(TODAY, YELLOW), TODAY, GREEN, { confirmBetter: true }, saved(day(TODAY, GREEN), false)],
    ['better confirmed keeps check-in', day(TODAY, YELLOW, true), TODAY, BLUE, { confirmBetter: true }, saved(day(TODAY, BLUE, true), false)],
    ['Red corrected to Green is not becameRed', day(TODAY, RED), TODAY, GREEN, { confirmBetter: true }, saved(day(TODAY, GREEN), false)],
  ])('%s', (_name, existing, date, requested, opts, expected) => {
    expect(decideSetColor(existing, date, requested, opts, TODAY)).toEqual(expected);
  });

  it('does not mutate the existing day', () => {
    const existing = day(TODAY, BLUE, true);
    decideSetColor(existing, TODAY, RED, {}, TODAY);
    expect(existing).toEqual(day(TODAY, BLUE, true));
  });

  test.each<[ColorLevel | null, ColorLevel, boolean]>([
    [null, RED, true],
    [GREEN, RED, true],
    [BLUE, RED, true],
    [YELLOW, RED, true],
    [RED, RED, false],
    [null, YELLOW, false],
    [GREEN, YELLOW, false],
  ])('becameRed: %p -> %p is %p', (previous, requested, becameRed) => {
    const existing = previous === null ? undefined : day(TODAY, previous);
    const outcome = decideSetColor(existing, TODAY, requested, {}, TODAY);
    expect(outcome.kind).toBe('saved');
    if (outcome.kind === 'saved') expect(outcome.becameRed).toBe(becameRed);
  });
});

describe('lowestOf', () => {
  test.each<[(ColorLevel | null)[], ColorLevel | null]>([
    [[], null],
    [[null, null], null],
    [[0], 0],
    [[0, 2, 1], 2],
    [[null, 3, 0], 3],
    [[1, null], 1],
    [[3, 3, 0], 3],
  ])('lowestOf(%p) = %p', (colors, expected) => {
    expect(lowestOf(colors)).toBe(expected);
  });
});
