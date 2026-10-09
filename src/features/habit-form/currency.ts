import { CURRENCIES } from '@/utils/format';

const SUPPORTED = new Set(CURRENCIES.map((c) => c.code));

type Currency = (typeof CURRENCIES)[number];

/** Case-insensitive search on code, name or exact symbol ("eur", "pound", "€"). */
export function filterCurrencies(query: string, list: Currency[] = CURRENCIES): Currency[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase() === q);
}

const EURO_REGIONS = [
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
  'AD', 'MC', 'SM', 'VA', 'ME', 'XK',
];

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  UA: 'UAH',
  PL: 'PLN',
  CH: 'CHF',
  LI: 'CHF',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  CN: 'CNY',
  IN: 'INR',
  BR: 'BRL',
  MX: 'MXN',
  TR: 'TRY',
  RU: 'RUB',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  CZ: 'CZK',
  KR: 'KRW',
  ZA: 'ZAR',
  ...Object.fromEntries(EURO_REGIONS.map((r) => [r, 'EUR'])),
};

/** Fallback when the locale has no region ("uk", "ja"): languages tied to one currency. */
const LANGUAGE_CURRENCY: Record<string, string> = {
  uk: 'UAH',
  pl: 'PLN',
  ja: 'JPY',
  ko: 'KRW',
  cs: 'CZK',
  sv: 'SEK',
  nb: 'NOK',
  nn: 'NOK',
  no: 'NOK',
  da: 'DKK',
  tr: 'TRY',
  ru: 'RUB',
  de: 'EUR',
  fr: 'EUR',
  it: 'EUR',
  nl: 'EUR',
  fi: 'EUR',
  el: 'EUR',
};

/** Best-effort currency for a BCP-47 locale ("en-GB" → GBP, "uk" → UAH, "zh-Hans-CN" → CNY). USD if unknown. */
export function currencyForLocale(locale: string | null | undefined): string {
  if (!locale) return 'USD';
  const parts = locale.replace(/_/g, '-').split('-');
  const lang = parts[0].toLowerCase();
  const region = parts.slice(1).find((p) => /^[A-Za-z]{2}$/.test(p) || /^\d{3}$/.test(p))?.toUpperCase();
  const byRegion = region ? REGION_CURRENCY[region] : undefined;
  const code = byRegion ?? LANGUAGE_CURRENCY[lang] ?? 'USD';
  return SUPPORTED.has(code) ? code : 'USD';
}

/** Guess the user's currency from the runtime locale (Intl), falling back to USD. */
export function guessDefaultCurrency(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return currencyForLocale(locale);
  } catch {
    return 'USD';
  }
}

/**
 * Rough units-per-US-dollar factors. Only used to turn preset spend defaults
 * (defined in USD) into a believable starting value in another currency — the
 * user always edits the final number.
 */
const APPROX_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.9,
  GBP: 0.8,
  UAH: 41,
  PLN: 4,
  CHF: 0.9,
  CAD: 1.4,
  AUD: 1.5,
  JPY: 150,
  CNY: 7.2,
  INR: 85,
  BRL: 5.5,
  MXN: 18,
  TRY: 35,
  RUB: 90,
  SEK: 10.5,
  NOK: 10.5,
  DKK: 7,
  CZK: 23,
  KRW: 1400,
  ZAR: 18,
};

/** Round to a "nice" amount someone would actually type: 4.5, 12, 410, 1,400. */
export function niceAmount(n: number): number {
  if (!(n > 0)) return 0;
  if (n < 10) return Math.max(0.5, Math.round(n * 2) / 2);
  if (n < 100) return Math.round(n);
  if (n < 1000) return Math.round(n / 5) * 5;
  if (n < 10000) return Math.round(n / 50) * 50;
  return Math.round(n / 500) * 500;
}

/** Convert a USD default into `currency` and round it nicely. */
export function convertDefaultCost(usd: number, currency: string): number {
  if (usd <= 0) return 0;
  const factor = APPROX_PER_USD[currency] ?? 1;
  return niceAmount(usd * factor);
}
