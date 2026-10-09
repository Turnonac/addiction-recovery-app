import type { Habit, Unlocks } from '@/types';
import { CERTIFICATE_DAYS, milestoneLabel } from './milestones';
import { wholeDays } from './time';

export interface CertificateInfo {
  key: string;
  habitId: string;
  habitName: string;
  days: number;
  label: string;
  claimedAt: number | null;
}

/**
 * Certificates earned by the *current* streak of each habit. Claimed ones keep
 * their claim time; unclaimed ones are "available" (shown as a banner on Home).
 */
export function earnedCertificates(habits: Habit[], unlocks: Unlocks, now: number): CertificateInfo[] {
  const out: CertificateInfo[] = [];
  for (const h of habits) {
    const days = wholeDays(now - h.startedAt);
    for (const d of CERTIFICATE_DAYS) {
      if (d > days) break;
      const key = `${h.id}:${d}`;
      out.push({ key, habitId: h.id, habitName: h.name, days: d, label: milestoneLabel(d), claimedAt: unlocks.certificates[key] ?? null });
    }
  }
  return out;
}

/** Claimed certificates from any streak (they are kept after a relapse). */
export function claimedCertificates(habits: Habit[], unlocks: Unlocks): CertificateInfo[] {
  const byId = new Map(habits.map((h) => [h.id, h]));
  return Object.entries(unlocks.certificates)
    .map(([key, claimedAt]): CertificateInfo | null => {
      const [habitId, daysStr] = key.split(':');
      const habit = byId.get(habitId);
      const days = Number(daysStr);
      if (!habit || !Number.isFinite(days)) return null;
      return { key, habitId, habitName: habit.name, days, label: milestoneLabel(days), claimedAt };
    })
    .filter((c): c is CertificateInfo => c !== null)
    .sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0));
}

/** The best unclaimed certificate to advertise on Home (largest milestone first). */
export function nextAvailableCertificate(habits: Habit[], unlocks: Unlocks, now: number): CertificateInfo | null {
  const available = earnedCertificates(habits, unlocks, now).filter((c) => c.claimedAt == null);
  if (!available.length) return null;
  return available.sort((a, b) => b.days - a.days)[0];
}
