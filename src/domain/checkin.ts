import { RED, type ColorLevel, type DayLog, type LocalDate, type SetColorOutcome } from './types';

/**
 * Decide what happens when the user picks `requested` for `date`
 * (docs/ARCHITECTURE.md, "Lowest wins" and "Late color after the call"):
 * - future days are locked;
 * - a worse color replaces a better one;
 * - a better color needs confirmation (`opts.confirmBetter`) before it is saved;
 * - a worse color on a checked-in day whose previous color was non-null is
 *   `worseAfterCall`. Today's check-in is cleared (the user is asked to call
 *   again); a past day keeps it, since that call really happened. Previous
 *   null keeps the check-in and is not worseAfterCall.
 */
export function decideSetColor(
  existing: DayLog | undefined,
  date: LocalDate,
  requested: ColorLevel,
  opts: { confirmBetter?: boolean },
  today: LocalDate,
): SetColorOutcome {
  if (date > today) return { kind: 'rejectedFuture' };

  const previous = existing?.color ?? null;
  const checkedIn = existing?.checkedIn ?? false;

  if (previous === null) {
    return {
      kind: 'saved',
      day: { date, color: requested, checkedIn },
      worseAfterCall: false,
      clearedCheckIn: false,
      becameRed: requested === RED,
    };
  }

  if (requested > previous) {
    const cleared = checkedIn && date === today;
    return {
      kind: 'saved',
      day: { date, color: requested, checkedIn: checkedIn && !cleared },
      worseAfterCall: checkedIn,
      clearedCheckIn: cleared,
      becameRed: requested === RED,
    };
  }

  if (requested < previous && !opts.confirmBetter) {
    return { kind: 'needsConfirmBetter', current: previous, requested };
  }

  // Same color (no-op save) or a confirmed better color: the check-in stays.
  return {
    kind: 'saved',
    day: { date, color: requested, checkedIn },
    worseAfterCall: false,
    clearedCheckIn: false,
    becameRed: false,
  };
}

/** Lowest color = highest severity among the non-null colors; null if none. */
export function lowestOf(colors: (ColorLevel | null)[]): ColorLevel | null {
  let lowest: ColorLevel | null = null;
  for (const c of colors) {
    if (c !== null && (lowest === null || c > lowest)) lowest = c;
  }
  return lowest;
}
