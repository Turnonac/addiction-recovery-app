import type { HabitPreset } from '@/domain/catalog/habits';
import { currentGoalDays, goalProgress } from '@/domain/milestones';
import { DAY, fractionalDays, MINUTE, wholeDays } from '@/domain/time';
import { chipMoney, habitChips, type HabitChipSpec } from '@/features/home/homeLogic';
import type { Habit, HabitKind, IconName } from '@/types';
import { formatMinutes } from '@/utils/format';
import { convertDefaultCost } from './currency';

export const NAME_MAX = 40;
export const REASON_MAX = 280;
export const MINUTES_MAX = 1440;
/** Ten years — anything longer is almost certainly a typo. */
export const GOAL_MAX = 3650;
export const GOAL_PRESETS = [7, 14, 30, 90, 180, 365] as const;
export const MINUTE_PRESETS = [15, 30, 60, 120] as const;

/** Raw, editable form state. Numbers the user types stay strings until validation. */
export interface HabitFormValues {
  kind: HabitKind;
  name: string;
  color: string;
  icon: IconName;
  startedAt: number;
  cost: string;
  currency: string;
  minutes: string;
  /** '' = Auto (next standard milestone). */
  goal: string;
  reason: string;
}

/** Fields the user changed by hand — preset/currency changes never overwrite them. */
export type TouchableField = 'name' | 'color' | 'icon' | 'cost' | 'minutes' | 'currency';
export type TouchedFields = Partial<Record<TouchableField, true>>;

export type HabitFormField = 'name' | 'startedAt' | 'cost' | 'minutes' | 'goal' | 'reason';
export type HabitFormErrors = Partial<Record<HabitFormField, string>>;

/** Parsed values ready for `addHabit` / `updateHabit`. */
export interface HabitFormOutput {
  kind: HabitKind;
  name: string;
  color: string;
  icon: IconName;
  startedAt: number;
  dailyCost: number;
  currency: string;
  dailyMinutes: number;
  goalDays: number | null;
  reason: string;
}

/**
 * Parse a money amount typed by a human. Accepts comma or dot decimals and
 * thousands separators ("4,50", "1 200", "1,200.50", "1.200,50"). Empty → 0,
 * anything else unparseable → NaN.
 */
export function parseDecimal(text: string): number {
  let t = text.replace(/[\s  ']/g, '');
  if (t === '') return 0;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // The later separator is the decimal one; the other groups thousands.
    const decSep = lastComma > lastDot ? ',' : '.';
    const groupSep = decSep === ',' ? '.' : ',';
    const idx = t.lastIndexOf(decSep);
    const intPart = t.slice(0, idx);
    const frac = t.slice(idx + 1);
    if (!isGrouped(intPart, groupSep) || !/^\d*$/.test(frac)) return Number.NaN;
    t = `${intPart.split(groupSep).join('')}.${frac}`;
  } else if (lastComma >= 0) {
    // "1,200" / "1,200,000" group thousands; any other single comma is a decimal comma.
    if (isGrouped(t, ',')) t = t.replace(/,/g, '');
    else if (t.indexOf(',') === lastComma) t = t.replace(',', '.');
    else return Number.NaN;
  } else if (t.indexOf('.') !== lastDot) {
    if (!isGrouped(t, '.')) return Number.NaN;
    t = t.replace(/\./g, '');
  }
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return Number.NaN;
  return Number(t);
}

/**
 * "1,200,000" with `sep` = ',' — digits in proper groups of three. The first
 * group can't start with 0, so "0,250" stays a decimal (0.25), not 250.
 */
function isGrouped(text: string, sep: ',' | '.'): boolean {
  return new RegExp(`^[1-9]\\d{0,2}(\\${sep}\\d{3})+$`).test(text);
}

/** Parse a whole number; empty → 0, anything else non-integer → NaN. */
export function parseWholeNumber(text: string): number {
  const t = text.trim();
  if (t === '') return 0;
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

/** Keep only characters that can form a decimal amount while typing. */
export function sanitizeDecimalInput(text: string): string {
  return text.replace(/[^\d.,\s]/g, '').slice(0, 12);
}

/** Keep only digits while typing. */
export function sanitizeIntegerInput(text: string, maxLength = 5): string {
  return text.replace(/\D/g, '').slice(0, maxLength);
}

/** Number → editable text without trailing zeros: 10 → "10", 4.5 → "4.5", 0 → "". */
export function numberToInput(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.round(n * 100) / 100);
}

/** Starting values for a preset (new habit / onboarding). */
export function valuesFromPreset(preset: HabitPreset, currency: string, startedAt: number): HabitFormValues {
  return {
    kind: preset.kind,
    name: preset.kind === 'custom' ? '' : preset.name,
    color: preset.color,
    icon: preset.icon,
    startedAt,
    cost: numberToInput(convertDefaultCost(preset.defaultDailyCost, currency)),
    currency,
    minutes: numberToInput(preset.defaultDailyMinutes),
    goal: '',
    reason: '',
  };
}

/** Editable values for an existing habit. */
export function valuesFromHabit(habit: Habit): HabitFormValues {
  return {
    kind: habit.kind,
    name: habit.name,
    color: habit.color,
    icon: habit.icon,
    startedAt: habit.startedAt,
    cost: numberToInput(habit.dailyCost),
    currency: habit.currency,
    minutes: numberToInput(habit.dailyMinutes),
    goal: habit.goalDays != null ? String(habit.goalDays) : '',
    reason: habit.reason,
  };
}

/** Switch to another preset, refilling only the fields the user hasn't edited. */
export function applyPreset(values: HabitFormValues, touched: TouchedFields, preset: HabitPreset): HabitFormValues {
  const fresh = valuesFromPreset(preset, values.currency, values.startedAt);
  return {
    ...values,
    kind: preset.kind,
    name: touched.name ? values.name : fresh.name,
    color: touched.color ? values.color : fresh.color,
    icon: touched.icon ? values.icon : fresh.icon,
    cost: touched.cost ? values.cost : fresh.cost,
    minutes: touched.minutes ? values.minutes : fresh.minutes,
  };
}

/** Change currency; an untouched preset cost is re-expressed in the new currency. */
export function changeCurrency(values: HabitFormValues, touched: TouchedFields, currency: string, preset?: HabitPreset): HabitFormValues {
  const cost = !touched.cost && preset ? numberToInput(convertDefaultCost(preset.defaultDailyCost, currency)) : values.cost;
  return { ...values, currency, cost };
}

export interface ValidateOptions {
  /** Earliest allowed quit date (e.g. the last relapse when editing). */
  minStartedAt?: number;
}

/** Validate and parse. `output` is null when there are errors. */
export function validateHabitForm(
  values: HabitFormValues,
  now: number,
  opts: ValidateOptions = {},
): { errors: HabitFormErrors; output: HabitFormOutput | null } {
  const errors: HabitFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Give your habit a name.';
  else if (name.length > NAME_MAX) errors.name = `Keep it under ${NAME_MAX} characters.`;

  // One minute of slack: the picker's "Now" is captured slightly before saving.
  if (!Number.isFinite(values.startedAt)) errors.startedAt = 'Pick a quit date.';
  else if (values.startedAt > now + MINUTE) errors.startedAt = "The quit date can't be in the future.";
  else if (opts.minStartedAt != null && values.startedAt < opts.minStartedAt) {
    errors.startedAt = "The current streak can't start before your last relapse.";
  }

  const cost = parseDecimal(values.cost);
  if (Number.isNaN(cost)) errors.cost = 'Enter an amount like 4.50';
  else if (cost < 0) errors.cost = "Spending can't be negative.";
  else if (cost > 1_000_000) errors.cost = 'That looks too large for a daily amount.';

  const minutes = parseWholeNumber(values.minutes);
  if (Number.isNaN(minutes)) errors.minutes = 'Use whole minutes, e.g. 30.';
  else if (minutes > MINUTES_MAX) errors.minutes = `A day only has ${MINUTES_MAX} minutes.`;

  let goalDays: number | null = null;
  if (values.goal.trim() !== '') {
    const g = parseWholeNumber(values.goal);
    if (Number.isNaN(g) || g < 1) errors.goal = 'Enter a number of days, e.g. 45.';
    else if (g > GOAL_MAX) errors.goal = `Pick a goal up to ${GOAL_MAX} days.`;
    else goalDays = g;
  }

  if (values.reason.length > REASON_MAX) errors.reason = `Keep it under ${REASON_MAX} characters.`;

  if (Object.keys(errors).length) return { errors, output: null };
  return {
    errors,
    output: {
      kind: values.kind,
      name,
      color: values.color,
      icon: values.icon,
      startedAt: Math.min(values.startedAt, now),
      dailyCost: Math.round(cost * 100) / 100,
      currency: values.currency,
      dailyMinutes: minutes,
      goalDays,
      reason: values.reason.trim(),
    },
  };
}

/** Order in which errors are revealed/scrolled to. */
export const FIELD_ORDER: HabitFormField[] = ['name', 'startedAt', 'cost', 'minutes', 'goal', 'reason'];

export function firstErrorField(errors: HabitFormErrors): HabitFormField | undefined {
  return FIELD_ORDER.find((f) => errors[f]);
}

/** Ended streaks of an existing habit, so the preview can match its Home card. */
export interface StreakHistory {
  /** Logged relapses (the attempt number is this + 1). */
  relapses: number;
  /** Sum of every ended streak (ms). */
  priorCleanMs: number;
  /** Longest ended streak (ms). */
  bestPriorMs: number;
}

export const NO_HISTORY: StreakHistory = { relapses: 0, priorCleanMs: 0, bestPriorMs: 0 };

/** Summarise a habit's relapses (each carries the streak it ended). */
export function streakHistory(relapses: readonly { streakMs: number }[]): StreakHistory {
  let priorCleanMs = 0;
  let bestPriorMs = 0;
  for (const r of relapses) {
    const ms = Math.max(0, r.streakMs);
    priorCleanMs += ms;
    bestPriorMs = Math.max(bestPriorMs, ms);
  }
  return { relapses: relapses.length, priorCleanMs, bestPriorMs };
}

export interface PreviewStats {
  /** Current streak (ms). */
  streakMs: number;
  /** Whole days of the current streak. */
  days: number;
  goalDays: number;
  /** 0..1 */
  progress: number;
  /** Money saved over all clean time (ended streaks + current), like the Home card. */
  moneySaved: number;
  /** Minutes saved over all clean time (0 when not tracked/invalid). */
  minutesSaved: number;
  /** Ended streaks + current streak (ms). */
  totalCleanMs: number;
  /** Parsed daily cost (0 when empty/invalid). */
  dailyCost: number;
  /** Parsed daily minutes (0 when empty/invalid). */
  dailyMinutes: number;
  attempt: number;
  /** The current streak is the longest so far (Home's "Record" chip). */
  isRecord: boolean;
}

/** What the habit card will show right now, computed from (possibly invalid) form input. */
export function previewStats(values: HabitFormValues, now: number, history: StreakHistory = NO_HISTORY): PreviewStats {
  const ms = Math.max(0, now - values.startedAt);
  const days = wholeDays(ms);
  const goalText = parseWholeNumber(values.goal);
  const userGoal = values.goal.trim() !== '' && goalText > 0 ? goalText : null;
  const goalDays = currentGoalDays(days, userGoal);
  const parsedCost = parseDecimal(values.cost);
  const parsedMinutes = parseWholeNumber(values.minutes);
  const dailyCost = Number.isFinite(parsedCost) && parsedCost > 0 ? parsedCost : 0;
  const dailyMinutes = Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? Math.min(parsedMinutes, MINUTES_MAX) : 0;
  const totalCleanMs = ms + Math.max(0, history.priorCleanMs);
  const cleanDays = fractionalDays(totalCleanMs);
  return {
    streakMs: ms,
    days,
    goalDays,
    progress: goalProgress(ms, goalDays),
    moneySaved: dailyCost * cleanDays,
    minutesSaved: dailyMinutes * cleanDays,
    totalCleanMs,
    dailyCost,
    dailyMinutes,
    attempt: history.relapses + 1,
    isRecord: ms > 0 && ms >= history.bestPriorMs,
  };
}

/**
 * The chips the Home card will show (same rules: money, or time when money isn't
 * tracked; the attempt after a relapse; "Record"). Before a full clean day has
 * accrued there's nothing saved yet, so the daily rate is shown instead.
 */
export function previewChips(s: PreviewStats, currency: string): HabitChipSpec[] {
  const chips = habitChips({
    habit: { dailyCost: s.dailyCost, dailyMinutes: s.dailyMinutes, currency },
    moneySaved: s.moneySaved,
    minutesSaved: s.minutesSaved,
    attempt: s.attempt,
    isRecord: s.isRecord,
  });
  if (s.totalCleanMs >= DAY) return chips;
  return chips.map((c) => {
    if (c.kind === 'money') return { ...c, label: `${chipMoney(s.dailyCost, currency)}/day` };
    if (c.kind === 'time') return { ...c, label: `${formatMinutes(s.dailyMinutes)}/day` };
    return c;
  });
}

/** True when the form differs from the values it was opened with. */
export function isFormDirty(initial: HabitFormValues, current: HabitFormValues): boolean {
  return (Object.keys(initial) as (keyof HabitFormValues)[]).some((k) => initial[k] !== current[k]);
}

/** "≈ $3,650 a year" style projection for hints; null when nothing is tracked. */
export function yearlyAmount(text: string): number | null {
  const n = parseDecimal(text);
  return Number.isFinite(n) && n > 0 ? n * 365 : null;
}

/** Minutes a day → hours a year. */
export function yearlyHours(text: string): number | null {
  const n = parseWholeNumber(text);
  return Number.isFinite(n) && n > 0 ? Math.round((n * 365) / 60) : null;
}
