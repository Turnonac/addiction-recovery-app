import { DAY, HOUR, MINUTE, MONTH, YEAR } from '@/domain/time';

export const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/**
 * 4823 -> "4.8K", 1250000 -> "1.3M", 950 -> "950", 12.5 -> "12.5".
 * Rounds before picking the unit, so 999.6 -> "1K" and 999950 -> "1M".
 * Non-finite input renders as "0".
 */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000 || Number(trim(abs / 1_000)) >= 1_000) return `${sign}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000 || Math.round(abs) >= 1_000) return `${sign}${trim(abs / 1_000)}K`;
  if (abs >= 100) return `${sign}${Math.round(abs)}`;
  return `${sign}${trim(abs)}`;
}

function trim(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
}

/** "$124.05" (full) or "$4.8K" (compact). Symbol placed before the amount. */
export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}): string {
  const sym = currencySymbol(currency);
  const body = opts.compact
    ? formatCompact(amount)
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sym}${body}`;
}

/** Integer with thousands separators: 12345 -> "12,345". */
export function formatInt(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}

/** "1 day" / "3 days" */
export function pluralDays(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Short two-unit duration: "1y 2mo", "1mo 28d", "3d 4h", "5h 12m", "12m", "<1m".
 */
export function formatDurationShort(ms: number): string {
  const v = Math.max(0, ms);
  if (v >= YEAR) {
    const y = Math.floor(v / YEAR);
    const mo = Math.floor((v % YEAR) / MONTH);
    return mo ? `${y}y ${mo}mo` : `${y}y`;
  }
  if (v >= MONTH) {
    const mo = Math.floor(v / MONTH);
    const d = Math.floor((v % MONTH) / DAY);
    return d ? `${mo}mo ${d}d` : `${mo}mo`;
  }
  if (v >= DAY) {
    const d = Math.floor(v / DAY);
    const h = Math.floor((v % DAY) / HOUR);
    return h ? `${d}d ${h}h` : `${d}d`;
  }
  if (v >= HOUR) {
    const h = Math.floor(v / HOUR);
    const m = Math.floor((v % HOUR) / MINUTE);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (v >= MINUTE) return `${Math.floor(v / MINUTE)}m`;
  return '<1m';
}

/** Minutes -> "3h 20m" / "45m" / "2d 4h" */
export function formatMinutes(minutes: number): string {
  return formatDurationShort(minutes * MINUTE);
}

/** Hours with one decimal for chart axes: 4.2h */
export function formatHours(minutes: number): string {
  return `${trim(minutes / 60)}h`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "29 Mar 2026" */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "29 Mar" */
export function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Mon" */
export function formatWeekday(ts: number): string {
  return WEEKDAYS[new Date(ts).getDay()];
}

/** "14:43" (24h, zero-padded) */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "29 Mar 2026, 14:43" */
export function formatDateTime(ts: number): string {
  return `${formatDate(ts)}, ${formatTime(ts)}`;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "Today" / "Yesterday" / "29 Mar 2026" */
export function formatRelativeDay(ts: number, now: number): string {
  const a = new Date(ts);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatDate(ts);
}

/** Percentage 0..1 -> "96%" (floored, so 29/30 days reads 96% like the original). */
export function formatPercent(fraction: number): string {
  return `${Math.floor(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}
