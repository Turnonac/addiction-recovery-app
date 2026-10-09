import { CURRENCIES } from '@/utils/format';

export type CurrencyDef = (typeof CURRENCIES)[number];

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .trim();
}

/**
 * Search currencies by code, name or symbol. Exact code matches come first,
 * then codes/names starting with the query, then anything containing it.
 */
export function filterCurrencies(query: string, list: readonly CurrencyDef[] = CURRENCIES): CurrencyDef[] {
  const q = normalize(query);
  if (!q) return [...list];
  const scored: { c: CurrencyDef; score: number; i: number }[] = [];
  list.forEach((c, i) => {
    const code = c.code.toLowerCase();
    const name = normalize(c.name);
    const symbol = c.symbol.toLowerCase();
    let score = -1;
    if (code === q) score = 0;
    else if (code.startsWith(q)) score = 1;
    else if (name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (symbol === q) score = 3;
    else if (name.includes(q)) score = 4;
    if (score >= 0) scored.push({ c, score, i });
  });
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).map((s) => s.c);
}

/** "$ · USD · US Dollar" style label pieces for a currency code (unknown codes fall back to the code). */
export function currencyInfo(code: string, list: readonly CurrencyDef[] = CURRENCIES): CurrencyDef {
  return list.find((c) => c.code === code) ?? { code, symbol: code, name: code };
}

/** Compact "symbol code" label ("€ EUR"); just the code when the symbol is the code itself ("CHF"). */
export function currencyLabel(c: Pick<CurrencyDef, 'code' | 'symbol'>): string {
  return c.symbol === c.code ? c.code : `${c.symbol} ${c.code}`;
}
