import { claimedCertificates, earnedCertificates, type CertificateInfo } from '@/domain/certificates';
import { relapsesFor } from '@/domain/habitStats';
import { CERTIFICATE_DAYS } from '@/domain/milestones';
import { DAY, wholeDays } from '@/domain/time';
import type { Habit, Relapse, Unlocks } from '@/types';

export interface CertificateStatus {
  key: string;
  /** Current streak reached `days`, or the certificate was claimed before. */
  earned: boolean;
  /** Earned by the current streak and not yet claimed — claim it now. */
  shouldClaim: boolean;
  claimedAt: number | null;
  /** When the milestone was reached (null if not earned). */
  earnedAt: number | null;
  /** Whole days left for a locked certificate (rounded up). */
  daysToGo: number;
  /** 0..1 progress of the current streak toward `days`. */
  progress: number;
  /** When the current streak will reach `days` (for the locked state). */
  unlocksAt: number;
}

/** Only the standard certificate milestones (7, 30, 90, 180, 365 days) exist. */
export function isCertificateDays(days: number): boolean {
  return (CERTIFICATE_DAYS as readonly number[]).includes(days);
}

/** Same format as the store's certificateKey (kept local so this stays pure). */
export function certKey(habitId: string, days: number): string {
  return `${habitId}:${days}`;
}

/**
 * When a claimed certificate was earned: the latest streak that reached `days`
 * no later than the claim; falls back to the claim time itself.
 */
export function pastEarnedAt(habitRelapses: Relapse[], days: number, claimedAt: number): number {
  let best: number | null = null;
  for (const r of habitRelapses) {
    if (r.streakMs < days * DAY) continue;
    const at = r.at - r.streakMs + days * DAY;
    if (at <= claimedAt && (best == null || at > best)) best = at;
  }
  return best ?? claimedAt;
}

export function certificateStatus(habit: Habit, relapses: Relapse[], unlocks: Unlocks, days: number, now: number): CertificateStatus {
  const key = certKey(habit.id, days);
  const claimedAt = unlocks.certificates[key] ?? null;
  const streakMs = Math.max(0, now - habit.startedAt);
  const earnedNow = wholeDays(streakMs) >= days;
  const currentEarnedAt = habit.startedAt + days * DAY;

  let earnedAt: number | null = null;
  if (claimedAt != null && (!earnedNow || claimedAt < currentEarnedAt)) {
    earnedAt = pastEarnedAt(relapsesFor(habit.id, relapses), days, claimedAt);
  } else if (earnedNow) {
    earnedAt = currentEarnedAt;
  }

  return {
    key,
    earned: earnedNow || claimedAt != null,
    shouldClaim: earnedNow && claimedAt == null,
    claimedAt,
    earnedAt,
    daysToGo: earnedNow ? 0 : Math.max(1, Math.ceil((currentEarnedAt - now) / DAY)),
    progress: days > 0 ? Math.min(1, streakMs / (days * DAY)) : 1,
    unlocksAt: currentEarnedAt,
  };
}

export interface CertificateListItem extends CertificateInfo {
  isNew: boolean;
  habitColor: string;
}

/**
 * Certificates for the achievements screen: earned-but-unclaimed ones first
 * (largest milestone first, flagged "New"), then claimed ones, newest first.
 */
export function certificateListItems(habits: Habit[], unlocks: Unlocks, now: number): CertificateListItem[] {
  const colorOf = new Map(habits.map((h) => [h.id, h.color]));
  const active = habits.filter((h) => !h.archived);
  const fresh = earnedCertificates(active, unlocks, now)
    .filter((c) => c.claimedAt == null)
    .sort((a, b) => b.days - a.days || a.habitName.localeCompare(b.habitName));
  // Ignore any non-standard keys (e.g. from an old hand-typed deep link).
  const claimed = claimedCertificates(habits, unlocks).filter((c) => isCertificateDays(c.days));
  const seen = new Set<string>();
  const out: CertificateListItem[] = [];
  for (const c of [...fresh, ...claimed]) {
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    out.push({ ...c, isNew: c.claimedAt == null, habitColor: colorOf.get(c.habitId) ?? '' });
  }
  return out;
}

/** Layout scale for a card `width` wide that is designed at `designWidth`: 1 on regular phones, down to `min` on narrow ones. */
export function cardScale(width: number, designWidth: number, min: number): number {
  if (!(width > 0) || !(designWidth > 0)) return 1;
  return Math.min(1, Math.max(min, width / designWidth));
}

/**
 * Font size (between `min` and `max`) at which `text` fits on one line `available`
 * px wide, estimating each character as `charWidth` × the font size. Used where
 * `adjustsFontSizeToFit` doesn't exist (react-native-web); text that still
 * doesn't fit at `min` wraps.
 */
export function fitFontSize(text: string, available: number, max: number, min: number, charWidth = 0.58): number {
  const chars = Array.from(text.trim()).length;
  if (chars === 0 || !(available > 0)) return max;
  return Math.min(max, Math.max(min, available / (chars * charWidth)));
}

/** "1 month" → "1 Month", "2 weeks" → "2 Weeks". */
export function titleCase(label: string): string {
  return label.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function certificateShareText(days: number, label: string, habitName: string): string {
  return `I earned my "${titleCase(label)} free from ${habitName}" certificate on Quit 🏅 ${days} days and counting.`;
}
