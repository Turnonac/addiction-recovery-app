import type { ExerciseId, Habit, IconName, JournalEntry, Relapse, SosSession } from '@/types';
import { relapsesFor } from './habitStats';
import { HOUR, fractionalDays, startOfDay } from './time';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type AchievementCategory = 'getting_started' | 'streaks' | 'savings' | 'mindfulness' | 'journal' | 'resilience';

export interface AchievementContext {
  habits: Habit[];
  relapses: Relapse[];
  journal: JournalEntry[];
  sosSessions: SosSession[];
  now: number;
}

export interface AchievementProgress {
  unlocked: boolean;
  /** 0..1 */
  progress: number;
  /** Current value, capped at `target` (e.g. 12 of 30 days). */
  current: number;
  target: number;
  /** Unit for `current / target`, e.g. "days", "entries", "EUR". */
  unit: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  color: string;
  tier: AchievementTier;
  category: AchievementCategory;
  evaluate: (ctx: AchievementContext) => AchievementProgress;
}

export interface AchievementResult extends AchievementProgress {
  def: AchievementDef;
}

/** Medal ring colors per tier. */
export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#EAB308',
  platinum: '#A5F3FC',
};

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export const TIER_ORDER: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum'];

/** Display order and labels of the sections on the achievements screen. */
export const CATEGORY_ORDER: AchievementCategory[] = ['getting_started', 'streaks', 'resilience', 'savings', 'mindfulness', 'journal'];

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  getting_started: 'Getting started',
  streaks: 'Streaks',
  resilience: 'Resilience',
  savings: 'Savings',
  mindfulness: 'Mindfulness',
  journal: 'Journal',
};

export const CATEGORY_ICONS: Record<AchievementCategory, IconName> = {
  getting_started: 'rocket-launch-outline',
  streaks: 'fire',
  resilience: 'shield-star',
  savings: 'piggy-bank-outline',
  mindfulness: 'lifebuoy',
  journal: 'notebook-outline',
};

// ---------------------------------------------------------------------------
// Derived facts (pure helpers, exported for tests and other screens)
// ---------------------------------------------------------------------------

function activeHabits(ctx: AchievementContext): Habit[] {
  return ctx.habits.filter((h) => !h.archived);
}

/** Current streak of a habit in fractional days. */
function streakDaysF(habit: Habit, now: number): number {
  return fractionalDays(now - habit.startedAt);
}

/**
 * Longest streak in fractional days across habits: the current streak of every
 * active habit and every ended streak (recorded on relapses) of any habit.
 */
export function bestStreakDays(ctx: AchievementContext): number {
  let best = 0;
  for (const h of activeHabits(ctx)) best = Math.max(best, streakDaysF(h, ctx.now));
  const known = new Set(ctx.habits.map((h) => h.id));
  for (const r of ctx.relapses) {
    if (known.has(r.habitId)) best = Math.max(best, fractionalDays(r.streakMs));
  }
  return best;
}

/**
 * Best streak (fractional days) that started after at least `minRelapses`
 * relapses of the same habit. Returns null when no habit has relapsed that often.
 */
export function bestStreakAfterRelapses(ctx: AchievementContext, minRelapses: number): number | null {
  let best: number | null = null;
  const actives = new Set(activeHabits(ctx).map((h) => h.id));
  for (const h of ctx.habits) {
    const rs = relapsesFor(h.id, ctx.relapses);
    if (rs.length < minRelapses) continue;
    // The streak ended by relapse i started after relapse i-1, i.e. after i relapses.
    for (let i = minRelapses; i < rs.length; i++) best = Math.max(best ?? 0, fractionalDays(rs[i].streakMs));
    // The current streak started after all of them.
    best = Math.max(best ?? 0, actives.has(h.id) ? streakDaysF(h, ctx.now) : 0);
  }
  return best;
}

/** Current streaks (fractional days) of active habits, longest first. */
function currentStreaksDesc(ctx: AchievementContext): number[] {
  return activeHabits(ctx)
    .map((h) => streakDaysF(h, ctx.now))
    .sort((a, b) => b - a);
}

/** Total clean ms for a habit across all attempts at `now`. */
function totalCleanMsFor(habit: Habit, relapses: Relapse[], now: number): number {
  let total = Math.max(0, now - habit.startedAt);
  for (const r of relapses) if (r.habitId === habit.id) total += Math.max(0, r.streakMs);
  return total;
}

/** Money saved per currency across active habits (all clean time). */
export function savedByCurrency(ctx: AchievementContext): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of activeHabits(ctx)) {
    if (h.dailyCost <= 0) continue;
    const saved = h.dailyCost * fractionalDays(totalCleanMsFor(h, ctx.relapses, ctx.now));
    out[h.currency] = (out[h.currency] ?? 0) + saved;
  }
  return out;
}

/** Hours of life regained across active habits (all clean time). */
export function hoursRegained(ctx: AchievementContext): number {
  let minutes = 0;
  for (const h of activeHabits(ctx)) {
    if (h.dailyMinutes <= 0) continue;
    minutes += h.dailyMinutes * fractionalDays(totalCleanMsFor(h, ctx.relapses, ctx.now));
  }
  return (minutes * 60_000) / HOUR;
}

/** Number of distinct local calendar days with at least one journal entry. */
export function distinctJournalDays(journal: JournalEntry[]): number {
  return new Set(journal.map((j) => startOfDay(j.createdAt))).size;
}

function completedSessions(ctx: AchievementContext, ids?: ExerciseId[]): number {
  return ctx.sosSessions.filter((s) => s.completed && (!ids || ids.includes(s.exerciseId))).length;
}

// ---------------------------------------------------------------------------
// Evaluator builders
// ---------------------------------------------------------------------------

function result(value: number, target: number, unit: string, progressValue: number = value): AchievementProgress {
  const unlocked = value >= target;
  const progress = unlocked ? 1 : Math.max(0, Math.min(0.999, progressValue / target));
  return { unlocked, progress, current: Math.min(target, Math.max(0, value)), target, unit };
}

/** Counter-style achievement (whole numbers). */
function count(target: number, unit: string, value: (ctx: AchievementContext) => number) {
  return (ctx: AchievementContext) => result(Math.floor(value(ctx)), target, unit);
}

/** Longest streak across habits reaching `days`. Progress moves smoothly with time. */
function streak(days: number) {
  return (ctx: AchievementContext): AchievementProgress => {
    const best = bestStreakDays(ctx);
    return result(Math.floor(best + 1e-9), days, days === 1 ? 'day' : 'days', best);
  };
}

/** `habitsNeeded` active habits clean for at least `days` at the same time. */
function concurrent(habitsNeeded: number, days: number) {
  return (ctx: AchievementContext): AchievementProgress => {
    const streaks = currentStreaksDesc(ctx);
    const qualifying = streaks.filter((d) => d >= days).length;
    const partial = streaks.slice(0, habitsNeeded).reduce((acc, d) => acc + Math.min(1, d / days), 0);
    return result(qualifying, habitsNeeded, 'habits', partial);
  };
}

/** A streak of `days` that started after `minRelapses` relapses of one habit. */
function afterRelapses(minRelapses: number, days: number) {
  return (ctx: AchievementContext): AchievementProgress => {
    const best = bestStreakAfterRelapses(ctx, minRelapses);
    if (best == null) return { unlocked: false, progress: 0, current: 0, target: days, unit: 'days' };
    return result(Math.floor(best + 1e-9), days, 'days', best);
  };
}

/** Money saved in the single best currency. */
function saved(target: number) {
  return (ctx: AchievementContext): AchievementProgress => {
    const entries = Object.entries(savedByCurrency(ctx)).sort((a, b) => b[1] - a[1]);
    const [currency, amount] = entries[0] ?? ['', 0];
    return result(Math.floor(amount), target, currency || 'saved', amount);
  };
}

function hours(target: number) {
  return (ctx: AchievementContext): AchievementProgress => {
    const h = hoursRegained(ctx);
    return result(Math.floor(h), target, 'hours', h);
  };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/** Compact catalog entry builder. */
function def(
  id: string,
  title: string,
  description: string,
  icon: IconName,
  color: string,
  tier: AchievementTier,
  category: AchievementCategory,
  evaluate: AchievementDef['evaluate'],
): AchievementDef {
  return { id, title, description, icon, color, tier, category, evaluate };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Getting started
  def('first_step', 'First step', 'Add your first habit to quit.', 'shoe-print', '#22C55E', 'bronze', 'getting_started',
    count(1, 'habit', (ctx) => ctx.habits.length)),
  def('streak_1', '24 hours', 'Stay clean for a full day.', 'hours-24', '#0EA5E9', 'bronze', 'getting_started',
    streak(1)),
  def('streak_3', '3 days', 'Push through the first three days — the hardest part.', 'fire', '#F97316', 'bronze', 'getting_started',
    streak(3)),
  // Streaks
  def('streak_7', '1 week', 'Stay clean for 7 days in a row.', 'calendar-week', '#3B82F6', 'silver', 'streaks',
    streak(7)),
  def('streak_14', '2 weeks', 'Keep a clean streak going for 14 days.', 'calendar-check', '#14B8A6', 'silver', 'streaks',
    streak(14)),
  def('streak_30', '1 month', 'A whole month free. New routines are taking hold.', 'calendar-month', '#8B5CF6', 'gold', 'streaks',
    streak(30)),
  def('streak_90', '3 months', 'Ninety days clean — a true turning point.', 'trophy-outline', '#EAB308', 'gold', 'streaks',
    streak(90)),
  def('streak_180', '6 months', 'Half a year of choosing yourself every day.', 'trophy', '#F59E0B', 'platinum', 'streaks',
    streak(180)),
  def('streak_365', '1 year', 'A full trip around the sun, free.', 'crown', '#EAB308', 'platinum', 'streaks',
    streak(365)),
  def('double_down', 'Double down', 'Keep 2 habits clean for at least 7 days at the same time.', 'checkbox-multiple-marked-circle-outline', '#6366F1', 'silver', 'streaks',
    concurrent(2, 7)),
  def('triple_threat', 'Triple threat', 'Keep 3 habits clean for at least 30 days at the same time.', 'podium-gold', '#EC4899', 'gold', 'streaks',
    concurrent(3, 30)),
  // Resilience
  def('honest', 'Honest', 'Log a relapse and name what triggered it.', 'hand-heart-outline', '#F43F5E', 'bronze', 'resilience',
    count(1, 'relapse', (ctx) => ctx.relapses.filter((r) => r.triggers.length > 0).length)),
  def('comeback', 'Comeback', 'Reach 7 days clean after a relapse.', 'restart', '#06B6D4', 'silver', 'resilience',
    afterRelapses(1, 7)),
  def('phoenix', 'Phoenix', 'Rise again: reach 30 days clean after 3 or more relapses.', 'bird', '#F97316', 'gold', 'resilience',
    afterRelapses(3, 30)),
  // Savings
  def('saved_100', 'Penny saver', 'Save 100 in any single currency.', 'piggy-bank-outline', '#22C55E', 'bronze', 'savings',
    saved(100)),
  def('saved_1000', 'Big saver', 'Save 1,000 in any single currency.', 'cash-multiple', '#84CC16', 'silver', 'savings',
    saved(1000)),
  def('saved_10000', 'Fortune', 'Save 10,000 in any single currency.', 'treasure-chest', '#EAB308', 'gold', 'savings',
    saved(10000)),
  def('hours_24', 'Time lord', 'Win back 24 hours of your life.', 'timer-sand-complete', '#0EA5E9', 'bronze', 'savings',
    hours(24)),
  def('hours_100', 'Life back', 'Win back 100 hours of your life.', 'history', '#3B82F6', 'silver', 'savings',
    hours(100)),
  // Mindfulness (SOS)
  def('sos_1', 'First rescue', 'Complete your first SOS exercise.', 'lifebuoy', '#EF4444', 'bronze', 'mindfulness',
    count(1, 'session', (ctx) => completedSessions(ctx))),
  def('sos_10', 'Craving crusher', 'Complete 10 SOS exercises.', 'arm-flex-outline', '#F97316', 'gold', 'mindfulness',
    count(10, 'sessions', (ctx) => completedSessions(ctx))),
  def('wave_rider', 'Wave rider', 'Complete the 10-minute Wait It Out exercise.', 'waves', '#06B6D4', 'silver', 'mindfulness',
    count(1, 'session', (ctx) => completedSessions(ctx, ['wait_it_out']))),
  def('calm_breather', 'Calm breather', 'Complete 5 breathing exercises.', 'weather-windy', '#3B82F6', 'silver', 'mindfulness',
    count(5, 'sessions', (ctx) => completedSessions(ctx, ['breathing_478', 'box_breathing']))),
  // Journal
  def('journal_1', 'Dear diary', 'Write your first journal entry.', 'notebook-outline', '#A855F7', 'bronze', 'journal',
    count(1, 'entry', (ctx) => ctx.journal.length)),
  def('journal_10', 'Storyteller', 'Write 10 journal entries.', 'book-open-page-variant-outline', '#8B5CF6', 'silver', 'journal',
    count(10, 'entries', (ctx) => ctx.journal.length)),
  def('journal_50', 'Chronicler', 'Write 50 journal entries.', 'bookshelf', '#6366F1', 'gold', 'journal',
    count(50, 'entries', (ctx) => ctx.journal.length)),
  def('mood_tracker', 'Mood tracker', 'Journal on 7 different days.', 'emoticon-happy-outline', '#EAB308', 'silver', 'journal',
    count(7, 'days', (ctx) => distinctJournalDays(ctx.journal))),
];

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Evaluate every achievement in catalog order. */
export function evaluateAll(ctx: AchievementContext): AchievementResult[] {
  return ACHIEVEMENTS.map((def) => ({ def, ...def.evaluate(ctx) }));
}

/** Ids that are earned now but not yet recorded in `unlocked`. */
export function newlyUnlockedIds(results: AchievementResult[], unlocked: Record<string, number>): string[] {
  return results.filter((r) => r.unlocked && unlocked[r.def.id] == null).map((r) => r.def.id);
}

/** An achievement counts as unlocked once it was ever recorded, even if no longer earned. */
export function isUnlocked(result: AchievementResult, unlocked: Record<string, number>): boolean {
  return unlocked[result.def.id] != null || result.unlocked;
}

/** The locked achievement closest to completion (ties → lower tier, then catalog order). */
export function nextClosest(results: AchievementResult[], unlocked: Record<string, number>): AchievementResult | null {
  let best: AchievementResult | null = null;
  for (const r of results) {
    if (isUnlocked(r, unlocked)) continue;
    if (!best) {
      best = r;
      continue;
    }
    if (r.progress > best.progress + 1e-9) best = r;
    else if (Math.abs(r.progress - best.progress) <= 1e-9 && TIER_ORDER.indexOf(r.def.tier) < TIER_ORDER.indexOf(best.def.tier)) best = r;
  }
  return best;
}

/** Highest tier first, then the later (harder) catalog entry — used to pick which unlock to announce. */
export function mostImpressive(ids: string[]): AchievementDef | undefined {
  const rank = (d: AchievementDef) => TIER_ORDER.indexOf(d.tier) * 1000 + ACHIEVEMENTS.indexOf(d);
  const defs = ids.map(achievementById).filter((d): d is AchievementDef => !!d);
  return defs.sort((a, b) => rank(b) - rank(a))[0];
}

/** Format `current / target unit` for progress lines. */
export function progressText(r: AchievementProgress): string {
  const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
  return `${fmt(r.current)} / ${fmt(r.target)} ${r.unit}`;
}
