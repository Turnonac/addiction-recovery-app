import { daysUntilRecovered, regionRecovery, type BrainRecoveryStats, type BrainRegion } from '@/domain/catalog/brain';
import { DAY, HOUR, MINUTE, YEAR } from '@/domain/time';

export type TimelineState = 'achieved' | 'current' | 'upcoming';

/** State of the timeline row at `index` when `achieved` milestones have been reached. */
export function timelineState(index: number, achieved: number): TimelineState {
  if (index < achieved) return 'achieved';
  if (index === achieved) return 'current';
  return 'upcoming';
}

function unit(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Mono time label for a milestone on the health timeline:
 * "20 MIN", "8 HOURS", "3 DAYS", "2 WEEKS", "66 DAYS", "3 MONTHS", "1 YEAR".
 */
export function milestoneTimeLabel(afterMs: number): string {
  const ms = Math.max(0, afterMs);
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} MIN`;
  if (ms < DAY) return unit(Math.round(ms / HOUR), 'HOUR', 'HOURS');
  const days = Math.round(ms / DAY);
  if (days < 7) return unit(days, 'DAY', 'DAYS');
  if (days % 365 === 0) return unit(days / 365, 'YEAR', 'YEARS');
  if (days % 30 === 0) return unit(days / 30, 'MONTH', 'MONTHS');
  if (days % 7 === 0) return unit(days / 7, 'WEEK', 'WEEKS');
  return unit(days, 'DAY', 'DAYS');
}

/** True when a milestone date should include the year (not in the current year). */
export function needsYear(ts: number, now: number): boolean {
  return new Date(ts).getFullYear() !== new Date(now).getFullYear();
}

/** "84 days" / "9 months" / "1 year": a rough day count for recovery copy. */
export function approxDays(days: number): string {
  const d = Math.max(1, Math.ceil(days));
  if (d < 120) return unit(d, 'day', 'days');
  // 345–364 days round to 12 months: call that a year, like the region's total.
  const months = Math.round(d / 30);
  if (d < 365 && months < 12) return unit(months, 'month', 'months');
  return unit(Math.max(1, Math.round((d * DAY) / YEAR)), 'year', 'years');
}

/**
 * Region ETA as in the reference ("nACh receptors · 65% · Recovered in ~84 days"):
 * the region's total recovery time, or "Fully recovered" once it is at 100%.
 */
export function recoveryEtaLabel(region: Pick<RegionView, 'fullRecoveryDays' | 'daysLeft'>): string {
  if (region.daysLeft <= 0) return 'Fully recovered';
  return `Recovered in ~${approxDays(region.fullRecoveryDays)}`;
}

/**
 * Remaining time for a region: "~55 days to go" ("" once recovered). Counted in
 * days under a year, so it never repeats the rounded total next to it
 * ("Recovered in ~6 months · ~170 days to go", not "~6 months to go" on day 10).
 */
export function daysToGoLabel(daysLeft: number): string {
  if (daysLeft <= 0) return '';
  const d = Math.ceil(daysLeft);
  return `~${d < 365 ? unit(d, 'day', 'days') : approxDays(d)} to go`;
}

/**
 * Glues the last word to the one before it with a no-break space, so a wrapped
 * caption breaks as "Recovered in / ~60 days" instead of "Recovered in ~60 / days".
 */
export function keepTailTogether(text: string): string {
  return text.replace(/ (\S+)$/, '\u00A0$1');
}

/** Subtitle of the brain recovery card: "3 of 5 systems recovering". */
export function brainCardSubtitle(stats: BrainRecoveryStats): string {
  if (stats.total === 0) return 'Brain systems overview';
  if (stats.recovered === stats.total) return `All ${stats.total} systems recovered`;
  // Same rounding as the ring next to it: "0%" must never read as "recovering".
  if (percentInt(stats.overall) === 0) return 'Recovery starts now';
  if (stats.recovered === 0) return `All ${stats.total} systems recovering`;
  return `${stats.recovering} of ${stats.total} systems recovering`;
}

/** Whole recovery percentage, floored like the rest of the app (99.9% is not 100%). */
export function percentInt(fraction: number): number {
  return Math.floor(Math.max(0, Math.min(1, fraction)) * 100);
}

export interface RegionView extends BrainRegion {
  /** 0..1 */
  recovery: number;
  /** Whole days until fully recovered (0 = recovered). */
  daysLeft: number;
}

/** Regions with their recovery at `cleanDays` (fractional), in catalog order. */
export function regionViews(regions: BrainRegion[], cleanDays: number): RegionView[] {
  return regions.map((r) => {
    const recovery = regionRecovery(cleanDays, r.fullRecoveryDays);
    return { ...r, recovery, daysLeft: recovery >= 1 ? 0 : Math.max(1, daysUntilRecovered(r, cleanDays)) };
  });
}

/**
 * Region selection on the brain screen. The description of a region is shown in
 * exactly one place: the detail panel under the brain (marker taps) or the
 * expanded row in the list (row taps). The panel lives in a fixed-height slot
 * (see RegionDetailSlot), so opening or closing it never moves the list.
 */
export interface RegionSelection {
  /** Region highlighted on the brain and in the list. */
  selectedId: string | null;
  /** Region shown in the detail panel under the brain (set by marker taps). */
  panelId: string | null;
  /** Rows whose description is expanded. */
  expanded: readonly string[];
}

export const NO_REGION_SELECTION: RegionSelection = { selectedId: null, panelId: null, expanded: [] };

/** Marker tap: toggles the detail panel for `id`; its row collapses so the text isn't repeated. */
export function tapRegionMarker(s: RegionSelection, id: string): RegionSelection {
  if (s.panelId === id) return { ...s, selectedId: null, panelId: null };
  return { selectedId: id, panelId: id, expanded: s.expanded.filter((e) => e !== id) };
}

/** Row tap: toggles that row's description and highlights its marker; closes the panel when expanding. */
export function tapRegionRow(s: RegionSelection, id: string): RegionSelection {
  if (s.expanded.includes(id)) {
    return { ...s, selectedId: s.selectedId === id ? null : s.selectedId, expanded: s.expanded.filter((e) => e !== id) };
  }
  return { selectedId: id, panelId: null, expanded: [...s.expanded, id] };
}

/** Close button of the detail panel. */
export function closeRegionPanel(s: RegionSelection): RegionSelection {
  return { ...s, selectedId: s.selectedId === s.panelId ? null : s.selectedId, panelId: null };
}
