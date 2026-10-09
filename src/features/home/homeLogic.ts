import type { CertificateInfo } from '@/domain/certificates';
import { milestoneAfter, milestoneLabel } from '@/domain/milestones';
import { DAY, HOUR, MINUTE } from '@/domain/time';
import type { IconName } from '@/types';
import { currencySymbol, formatInt, formatMinutes, formatMoney } from '@/utils/format';

/** Value + unit shown on a habit card ("29" + "days", or "5" + "hours" on day one). */
export interface StreakDisplay {
  value: string;
  unit: string;
}

/**
 * Big number on a habit card. Whole days once the streak is a day old; before
 * that hours, then minutes ("<1 min" in the first minute), so a habit added
 * today still feels alive. A missing or corrupt start date (NaN) counts as a
 * streak that just began rather than showing "NaN".
 */
export function streakDisplay(streakMs: number): StreakDisplay {
  const ms = Number.isFinite(streakMs) ? Math.max(0, streakMs) : 0;
  if (ms >= DAY) {
    const days = Math.floor(ms / DAY);
    return { value: formatInt(days), unit: days === 1 ? 'day' : 'days' };
  }
  if (ms >= HOUR) {
    const hours = Math.floor(ms / HOUR);
    return { value: String(hours), unit: hours === 1 ? 'hour' : 'hours' };
  }
  if (ms < MINUTE) return { value: '<1', unit: 'min' };
  return { value: String(Math.floor(ms / MINUTE)), unit: 'min' };
}

/** Streak as a phrase for sentences: "29 days", "1 day", "5 hours", "12 minutes", "less than a minute". */
export function streakPhrase(streakMs: number): string {
  const { value, unit } = streakDisplay(streakMs);
  if (unit !== 'min') return `${value} ${unit}`;
  if (value === '<1') return 'less than a minute';
  return `${value} ${value === '1' ? 'minute' : 'minutes'}`;
}

/** Widths of the glyphs that show up in amounts, currency symbols and ISO codes. */
const GLYPH_EM: Record<string, number> = {
  ...Object.fromEntries('0123456789+'.split('').map((d) => [d, 0.65])),
  '.': 0.27,
  ',': 0.27,
  ' ': 0.27,
  '…': 1.06,
  B: 0.67,
  C: 0.75,
  D: 0.73,
  E: 0.61,
  F: 0.59,
  H: 0.75,
  K: 0.74,
  M: 0.95,
  R: 0.67,
  S: 0.66,
  W: 1,
  r: 0.43,
  ł: 0.29,
  $: 0.66,
  '€': 0.7,
  '£': 0.65,
  '¥': 0.6,
  '₴': 0.79,
  '₹': 0.59,
  '₺': 0.67,
  '₽': 0.76,
  '₩': 1.08,
};

/**
 * Approximate width of `text` in ems for the bold system UI font (measured on
 * Inter/SF-like faces, rounded up). Used to keep summary values inside their
 * cell on web, where `adjustsFontSizeToFit` does nothing.
 */
export function textEm(text: string): number {
  let em = 0;
  for (const ch of text) em += GLYPH_EM[ch] ?? (/\p{Ll}/u.test(ch) ? 0.6 : 0.76);
  return em;
}

/** Rounds to `decimals` places and drops a trailing ".0" ("4.8", "5"). */
function roundTo(n: number, decimals: number): string {
  const f = 10 ** decimals;
  const s = (Math.round(n * f) / f).toFixed(decimals);
  return decimals === 2 ? s : s.replace(/\.0+$/, '');
}

const COMPACT_UNITS: [number, string][] = [
  [1e3, 'K'],
  [1e6, 'M'],
  [1e9, 'B'],
];

/**
 * Ways to write a positive amount without a currency, most precise first:
 * cents below 100 ("12.50", "12.5", "13"), whole units below a thousand,
 * then K / M / B with one decimal and without ("4.8K", "5K"). Rounding is done
 * before the unit is picked, so 999.6 is "1K" (never "1000") and 999,960 is
 * "1M" (never "1000K").
 */
function amountForms(v: number): string[] {
  const forms: string[] = [];
  const add = (s: string) => {
    if (!forms.includes(s)) forms.push(s);
  };
  if (Math.round(v * 100) < 100 * 100) {
    const cents = roundTo(v, 2);
    add(cents.endsWith('.00') ? cents.slice(0, -3) : cents);
    if (Math.round(v * 10) > 0) add(roundTo(v, 1));
  }
  if (Math.round(v) >= 1 && Math.round(v) < 1000) add(String(Math.round(v)));
  COMPACT_UNITS.forEach(([div, suffix], i) => {
    // A unit is only used from (rounded) 1 up: 900K never becomes "1M".
    if (Math.round((v / div) * 10) < 10) return;
    const last = i === COMPACT_UNITS.length - 1;
    for (const decimals of [1, 0]) {
      const r = Math.round((v / div) * 10 ** decimals) / 10 ** decimals;
      if (last || r < 1000) add(`${roundTo(v / div, decimals)}${suffix}`);
    }
  });
  return forms.length ? forms : ['0'];
}

/** A finite, non-negative amount (NaN and negatives count as nothing). */
function cleanAmount(amount: number): number {
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

/** Index of the first (most precise) form within `maxEm`, or -1 when none fits. */
function firstFitting(forms: string[], maxEm: number): number {
  return forms.findIndex((f) => textEm(f) <= maxEm);
}

/** The most precise form within `maxEm`; when none fits, the narrowest one. */
function pickForm(forms: string[], maxEm = Infinity): string {
  const i = firstFitting(forms, maxEm);
  if (i >= 0) return forms[i];
  return forms.reduce((a, b) => (textEm(b) < textEm(a) ? b : a));
}

/** Bare amount forms of a cleaned amount, "0" for nothing. */
function moneyForms(v: number): string[] {
  return v > 0 ? amountForms(v) : ['0'];
}

export interface ShortMoneyOptions {
  /**
   * Width budget in ems (see `textEm`). The most precise form that fits wins
   * ("CHF10.2K" → "CHF10K"); when none fits, the narrowest one. Defaults to
   * no limit.
   */
  maxEm?: number;
  /** Prefix instead of the currency symbol, e.g. the ISO code "CNY". */
  label?: string;
}

/**
 * Short money for tight spots (summary stat, "+€358" extras, share text):
 * "₴4.8K" from a thousand up, whole units from 100, cents below that ("$2.10",
 * but "$10" not "$10.00"), "$0" for nothing.
 */
export function shortMoney(amount: number, currency: string, opts: ShortMoneyOptions = {}): string {
  const prefix = opts.label ?? currencySymbol(currency);
  return pickForm(
    moneyForms(cleanAmount(amount)).map((f) => `${prefix}${f}`),
    opts.maxEm,
  );
}

/**
 * A count for a summary cell: "13,278" in full when it fits `maxEm` (see
 * `textEm`), otherwise compact like money ("13.3K", then "13K"). Without a
 * budget the full number is always used.
 */
export function shortCount(n: number, maxEm = Infinity): string {
  const v = Math.floor(cleanAmount(n));
  const compact = v >= 1000 ? amountForms(v).filter((f) => /[KMB]$/.test(f)) : [];
  return pickForm([formatInt(v), ...compact], maxEm);
}

/** Money on a habit chip, like the original: "$124.05" below a thousand, "₴4.8K" above. */
export function chipMoney(amount: number, currency: string): string {
  const v = cleanAmount(amount);
  return Math.round(v * 100) >= 1000 * 100 ? shortMoney(v, currency) : formatMoney(v, currency);
}

export interface SavingsSummary {
  /** Main value, e.g. "₴4.8K"; "—" when no habit tracks money. */
  value: string;
  /** Other currencies, e.g. "+€358 +$124". Undefined for a single currency. */
  sub?: string;
  /**
   * Set when the currency symbol costs the value precision or doesn't fit at
   * all ("CHF3.8K" in a 99px cell would have to become "CHF4K"): `value` is
   * then the bare amount ("3.8K") and this ISO code goes into the label
   * instead ("CHF SAVED").
   */
  code?: string;
}

/** Width budgets (in ems, see `textEm`) for the summary value and its sub line. */
export interface SavingsFit {
  value: number;
  sub: number;
}

/** How many secondary currencies the summary lists at most; more become "…". */
const MAX_EXTRA_CURRENCIES = 2;

/** Cleaned savings, largest first (ties by code, so the order is stable). */
function rankSavings(byCurrency: Record<string, number>): [string, number][] {
  return Object.entries(byCurrency)
    .map(([code, amount]): [string, number] => [code, cleanAmount(amount)])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * Headline amount with its symbol, unless the symbol doesn't fit at all, or
 * is a multi-letter one ("CHF", "MX$", "kr") that would cost a digit of
 * precision ("CHF4K" where "3.8K" fits): then the bare amount plus `code`.
 * One-glyph symbols ($ € ₴…) are worth more than that digit and stay.
 */
function savingsHeadline(code: string, amount: number, maxEm?: number): SavingsSummary {
  const forms = moneyForms(amount);
  const symbol = currencySymbol(code);
  if (maxEm === undefined) return { value: `${symbol}${forms[0]}` };
  const withSymbol = firstFitting(
    forms.map((f) => `${symbol}${f}`),
    maxEm,
  );
  const bare = firstFitting(forms, maxEm);
  const keepsSymbol = withSymbol >= 0 && (withSymbol <= bare || [...symbol].length === 1);
  if (keepsSymbol) return { value: `${symbol}${forms[withSymbol]}` };
  return { value: pickForm(forms, maxEm), code };
}

/**
 * Home "SAVED" stat. Amounts in different currencies can't be added, so the
 * currency with the largest amount becomes the headline and the rest are
 * listed underneath as "+€358 +$124" (all short, see `shortMoney`).
 * Currencies with nothing saved yet (rounds to 0) are left out of that line.
 * An extra whose symbol is shared with another listed currency (¥ for JPY and
 * CNY, kr for SEK/NOK/DKK) is labeled with its ISO code instead: "+CNY12K".
 *
 * `fit` sets width budgets, for web where text can't shrink itself: the
 * headline then uses the most precise form that fits, moving a multi-letter
 * symbol ("CHF", "MX$", "R$") into the label when that keeps more precision,
 * or any symbol when it's the only way to fit (see `savingsHeadline`); the sub
 * line shows fewer decimals, then fewer currencies ("+€358 …").
 */
export function summarizeSavings(byCurrency: Record<string, number>, fit?: SavingsFit): SavingsSummary {
  const entries = rankSavings(byCurrency);
  if (!entries.length) return { value: '—' };
  const [[topCode, topAmount], ...others] = entries;
  const head = savingsHeadline(topCode, topAmount, fit?.value);
  const rest = others.filter(([, amount]) => Math.round(amount * 100) > 0);
  if (!rest.length) return head;

  const symbols = [topCode, ...rest.map(([code]) => code)].map(currencySymbol);
  const labelFor = (code: string) => (symbols.filter((sym) => sym === currencySymbol(code)).length > 1 ? code : undefined);
  const extra = (code: string, amount: number, narrow: boolean) =>
    `+${shortMoney(amount, code, { label: labelFor(code), maxEm: narrow ? 0 : undefined })}`;
  const line = (count: number, narrow: boolean) => {
    const parts = rest.slice(0, count).map(([code, amount]) => extra(code, amount, narrow));
    if (rest.length > count) parts.push('…');
    return parts.join(' ');
  };

  const most = Math.min(rest.length, MAX_EXTRA_CURRENCIES);
  if (!fit) return { ...head, sub: line(most, false) };
  for (let count = most; count >= 1; count--) {
    for (const narrow of [false, true]) {
      const sub = line(count, narrow);
      if (textEm(sub) <= fit.sub) return { ...head, sub };
    }
  }
  return { ...head, sub: line(1, true) };
}

/**
 * Icon for the "SAVED" stat: the headline currency's own sign when there is
 * one, a dollar only for dollar currencies, and plain cash otherwise (CHF,
 * kr, zł…) or when nothing is tracked.
 */
export function savingsIcon(byCurrency: Record<string, number>): IconName {
  const top = rankSavings(byCurrency)[0]?.[0];
  return (top && CURRENCY_ICONS[top]) || 'cash';
}

const CURRENCY_ICONS: Record<string, IconName> = {
  USD: 'currency-usd',
  CAD: 'currency-usd',
  AUD: 'currency-usd',
  MXN: 'currency-usd',
  EUR: 'currency-eur',
  GBP: 'currency-gbp',
  UAH: 'currency-uah',
  JPY: 'currency-jpy',
  CNY: 'currency-cny',
  INR: 'currency-inr',
  BRL: 'currency-brl',
  RUB: 'currency-rub',
  TRY: 'currency-try',
  KRW: 'currency-krw',
};

export type HabitChipKind = 'money' | 'time' | 'attempt' | 'record';

export interface HabitChipSpec {
  kind: HabitChipKind;
  label: string;
  icon: IconName;
}

/** The subset of a HabitSnapshot that decides which chips a habit card shows. */
export interface ChipSource {
  habit: { dailyCost: number; dailyMinutes: number; currency: string };
  moneySaved: number;
  minutesSaved: number;
  attempt: number;
  isRecord: boolean;
}

/**
 * Chips along the bottom of a habit card, in display order:
 * money saved (or time saved when money isn't tracked), the attempt number
 * (after a relapse, or when there is nothing else to show), and "Record"
 * when the current streak is the best one so far.
 */
export function habitChips(s: ChipSource): HabitChipSpec[] {
  const chips: HabitChipSpec[] = [];
  if (s.habit.dailyCost > 0) {
    chips.push({ kind: 'money', label: chipMoney(s.moneySaved, s.habit.currency), icon: 'cash' });
  } else if (s.habit.dailyMinutes > 0) {
    chips.push({ kind: 'time', label: formatMinutes(s.minutesSaved), icon: 'clock-outline' });
  }
  if (s.attempt > 1 || chips.length === 0) {
    chips.push({ kind: 'attempt', label: `Attempt ${s.attempt}`, icon: 'flag-outline' });
  }
  if (s.isRecord) chips.push({ kind: 'record', label: 'Record', icon: 'trophy-outline' });
  return chips;
}

/** Goal of a streak that just began: the first milestone (1 day). */
const FIRST_GOAL_DAYS = milestoneAfter(0);

/**
 * Goal and progress safe for display. A corrupt or missing start date makes a
 * snapshot's goal and progress NaN ("NaN days", "NaN%"); like `streakDisplay`,
 * that reads as a streak that just began: the first goal at 0%.
 */
export function goalView(s: { goalDays: number; progress: number }): { goalDays: number; progress: number } {
  return {
    goalDays: Number.isFinite(s.goalDays) && s.goalDays > 0 ? s.goalDays : FIRST_GOAL_DAYS,
    progress: Number.isFinite(s.progress) ? Math.min(1, Math.max(0, s.progress)) : 0,
  };
}

/** Goal line on a habit card: "30 days", "1 day", "1,000 days", or "2 years" for yearly goals. */
export function goalLabel(goalDays: number): string {
  const days = goalView({ goalDays, progress: 0 }).goalDays;
  if (days >= 365 && days % 365 === 0) return milestoneLabel(days);
  return `${formatInt(days)} ${days === 1 ? 'day' : 'days'}`;
}

/** Body line of the "Certificate available" banner. */
export function certificateBannerText(cert: Pick<CertificateInfo, 'days' | 'habitName'>): string {
  return `${milestoneLabel(cert.days)} free from ${cert.habitName} – tap to receive your certificate`;
}

/** Route that opens the certificate screen for a banner. */
export function certificateHref(cert: Pick<CertificateInfo, 'habitId' | 'days'>): string {
  return `/certificate?habitId=${encodeURIComponent(cert.habitId)}&days=${cert.days}`;
}
