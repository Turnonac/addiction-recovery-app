import { DAY, HOUR, MINUTE, MONTH, WEEK, YEAR } from '@/domain/time';
import { currencySymbol, formatDurationShort } from '@/utils/format';

/** No-break space: keeps a multi-letter symbol on the same line as its number. */
const NBSP = '\u00A0';

const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');

/**
 * Compact number like formatCompact, but rounded before the unit is picked, so values
 * just under a boundary roll over: 4823 → "4.8K", 999.6 → "1K", 999,990 → "1M" (not "1000K").
 */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000 || Number(oneDecimal(abs / 1_000)) >= 1_000) return `${sign}${oneDecimal(abs / 1_000_000)}M`;
  if (abs >= 1_000 || Math.round(abs) >= 1_000) return `${sign}${oneDecimal(abs / 1_000)}K`;
  if (abs >= 100 || Number(oneDecimal(abs)) >= 100) return `${sign}${Math.round(abs)}`;
  return `${sign}${oneDecimal(abs)}`;
}

/**
 * The mark shown for a currency: its symbol, or the ISO code when another currency in view
 * shares that symbol (`useCode`, e.g. JPY and CNY are both "¥").
 */
export function currencyMark(currency: string, useCode: boolean = false): string {
  return useCode ? currency : currencySymbol(currency);
}

/**
 * "4.6K₴" — compact amount with the currency mark as a suffix (statistics style). Marks
 * longer than one character get a no-break space: "36.5K MX$", "5K CHF", "12K JPY".
 */
export function moneySuffix(amount: number, currency: string, useCode: boolean = false): string {
  const mark = currencyMark(currency, useCode);
  return `${compactNumber(amount)}${Array.from(mark).length > 1 ? NBSP : ''}${mark}`;
}

/** Currencies whose symbol is shared by another currency in the list (JPY + CNY "¥", SEK + NOK "kr"). */
export function ambiguousCurrencies(codes: string[]): Set<string> {
  const bySymbol = new Map<string, string[]>();
  for (const code of new Set(codes)) {
    const sym = currencySymbol(code);
    bySymbol.set(sym, [...(bySymbol.get(sym) ?? []), code]);
  }
  return new Set([...bySymbol.values()].filter((group) => group.length > 1).flat());
}

/** Label of a currency in a list: its symbol, plus the ISO code when the symbol alone is ambiguous ("¥ JPY"). */
export function currencyTag(currency: string, ambiguous: boolean = false): string {
  const sym = currencySymbol(currency);
  return ambiguous && sym !== currency ? `${sym} ${currency}` : sym;
}

/** Font size for a carousel card's number so value + suffix fit 136pt on every platform. */
export function cardValueFontSize(value: string, suffix: string = ''): number {
  const len = Array.from(value).length + Array.from(suffix).length;
  if (len <= 7) return 24;
  if (len <= 9) return 20;
  return 17;
}

/** Compact axis label with lowercase units: 6600 → "6.6k", 950 → "950", 0 → "0". */
export function axisCompact(n: number): string {
  if (n === 0) return '0';
  return compactNumber(n).replace('K', 'k').replace('M', 'm');
}

/** Hours for a minutes amount, without a unit: 0 → "0", 252 → "4.2", 14580 → "243", 125940 → "2,099", 10⁶ → "16.7K". */
export function hoursValue(minutes: number): string {
  const h = Math.max(0, minutes) / 60;
  if (Number(h.toFixed(1)) < 10) return h.toFixed(1).replace(/\.0$/, '');
  if (Math.round(h) < 10_000) return Math.round(h).toLocaleString('en-US');
  return compactNumber(h);
}

/** Hours label for a minutes amount: 252 → "4.2h", 14580 → "243h", 125940 → "2,099h". */
export function hoursLabel(minutes: number): string {
  return `${hoursValue(minutes)}h`;
}

/** Letters, digits and common caseless scripts count toward an abbreviation; emoji, spaces and punctuation don't. */
function isWordChar(ch: string): boolean {
  if (ch.toLowerCase() !== ch.toUpperCase()) return true;
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x30 && c <= 0x39) || // 0-9
    (c >= 0x0590 && c <= 0x08ff) || // Hebrew, Arabic, Syriac, Thaana
    (c >= 0x0900 && c <= 0x0eff) || // Indic scripts, Thai, Lao
    (c >= 0x3040 && c <= 0x30ff) || // Hiragana, Katakana
    (c >= 0x3400 && c <= 0x9fff) || // CJK
    (c >= 0xac00 && c <= 0xd7af) // Hangul
  );
}

/** Short uppercase tag of a name, by code point (never splits an emoji): "🍫🍬 Chocolate" → "CHO". */
export function abbreviate(name: string, length: number = 3): string {
  const chars = Array.from(name);
  const word = chars.filter(isWordChar);
  if (!word.length) return chars.find((ch) => ch.trim()) ?? '?';
  return word.slice(0, length).join('').toUpperCase();
}

/**
 * A distinct abbreviation per habit for chart labels: 3 letters, a 4th when that tells
 * look-alikes apart ("Gaming" → "GAMI", "Gambling" → "GAMB"), else a running number.
 */
export function habitAbbreviations(habits: { id: string; name: string }[]): Map<string, string> {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const h of habits) {
    const key = abbreviate(h.name);
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }
  const out = new Map<string, string>();
  for (const [base, group] of groups) {
    if (group.length === 1) {
      out.set(group[0].id, base);
      continue;
    }
    const longer = group.map((h) => abbreviate(h.name, 4));
    const distinct = new Set(longer).size === group.length;
    group.forEach((h, i) => out.set(h.id, distinct ? longer[i] : `${base}${i + 1}`));
  }
  return out;
}

export interface DurationParts {
  value: string;
  unit: string;
}

/** Big-number form of a duration: days when ≥ 1 day, else hours, else minutes. */
export function durationParts(ms: number): DurationParts {
  const v = Math.max(0, ms);
  if (v >= DAY) {
    const d = Math.floor(v / DAY);
    return { value: String(d), unit: d === 1 ? 'day' : 'days' };
  }
  if (v >= HOUR) {
    const h = Math.floor(v / HOUR);
    return { value: String(h), unit: h === 1 ? 'hour' : 'hours' };
  }
  const m = Math.floor(v / MINUTE);
  return { value: String(m), unit: 'min' };
}

/** Very short duration for chart labels: "45m", "5h", "12d", "3w", "4mo", "2y". */
export function spanLabel(ms: number): string {
  const v = Math.max(0, ms);
  if (v < HOUR) return `${Math.round(v / MINUTE)}m`;
  if (v < 2 * DAY) return `${Math.round(v / HOUR)}h`;
  if (v < 2 * WEEK) return `${Math.round(v / DAY)}d`;
  if (v < 3 * MONTH) return `${Math.round(v / WEEK)}w`;
  if (v < 2 * YEAR) return `${Math.round(v / MONTH)}mo`;
  return `${Math.round(v / YEAR)}y`;
}

/** Short day count for bar labels: 0.4 day → "9h", 12.7 days → "12d". */
export function shortDays(ms: number): string {
  const v = Math.max(0, ms);
  if (v < HOUR) return `${Math.floor(v / MINUTE)}m`;
  if (v < DAY) return `${Math.floor(v / HOUR)}h`;
  return `${Math.floor(v / DAY)}d`;
}

/** Rounded percentage: 0.4 → "40%", 1/3 → "33%". */
export function roundPercent(fraction: number): string {
  return `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}

/** "00:00" style hour label. */
export function hourLabel(h: number): string {
  const x = ((Math.floor(h) % 24) + 24) % 24;
  return `${x < 10 ? '0' : ''}${x}:00`;
}

/** Compact number without a unit for big card values: 4600 → "4.6K", 127.4 → "127", 12.25 → "12.3". */
export function formatCompactParts(n: number): string {
  return compactNumber(Math.max(0, n));
}

/** Day-based duration (no months, matching streak counters): "33d", "29d 3h", "20h 43m", "12m". */
export function daysHours(ms: number): string {
  const v = Math.max(0, ms);
  if (v < DAY) return formatDurationShort(v);
  const d = Math.floor(v / DAY);
  const h = Math.floor((v % DAY) / HOUR);
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** Axis tick in hours: one decimal while the axis tops out under 10h, whole hours above. */
export function hoursTick(minutes: number, maxMinutes: number): string {
  if (maxMinutes / 60 < 10) return `${(Math.max(0, minutes) / 60).toFixed(1)}h`;
  return `${Math.round(Math.max(0, minutes) / 60).toLocaleString('en-US')}h`;
}
