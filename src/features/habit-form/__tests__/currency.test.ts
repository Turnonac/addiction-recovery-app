import { convertDefaultCost, currencyForLocale, filterCurrencies, guessDefaultCurrency, niceAmount } from '../currency';

describe('currencyForLocale', () => {
  it.each([
    ['en-US', 'USD'],
    ['en-GB', 'GBP'],
    ['de-DE', 'EUR'],
    ['fr_FR', 'EUR'],
    ['uk-UA', 'UAH'],
    ['uk', 'UAH'],
    ['zh-Hans-CN', 'CNY'],
    ['ja-JP', 'JPY'],
    ['pt-BR', 'BRL'],
    ['es-MX', 'MXN'],
    ['en-NZ', 'USD'],
    ['en', 'USD'],
    ['', 'USD'],
    [undefined, 'USD'],
  ])('%p → %p', (locale, expected) => {
    expect(currencyForLocale(locale)).toBe(expected);
  });

  it('always returns a supported code from the runtime', () => {
    expect(guessDefaultCurrency()).toMatch(/^[A-Z]{3}$/);
  });
});

describe('default cost conversion', () => {
  it('rounds to amounts people would type', () => {
    expect(niceAmount(0)).toBe(0);
    expect(niceAmount(3.6)).toBe(3.5);
    expect(niceAmount(0.1)).toBe(0.5);
    expect(niceAmount(12.4)).toBe(12);
    expect(niceAmount(412)).toBe(410);
    expect(niceAmount(1380)).toBe(1400);
    expect(niceAmount(14000)).toBe(14000);
  });

  it('converts preset USD defaults', () => {
    expect(convertDefaultCost(10, 'USD')).toBe(10);
    expect(convertDefaultCost(10, 'EUR')).toBe(9);
    expect(convertDefaultCost(10, 'UAH')).toBe(410);
    expect(convertDefaultCost(4, 'JPY')).toBe(600);
    expect(convertDefaultCost(0, 'JPY')).toBe(0);
    expect(convertDefaultCost(10, 'XYZ')).toBe(10);
  });
});

describe('filterCurrencies', () => {
  it('matches code, name and symbol', () => {
    expect(filterCurrencies('').length).toBeGreaterThan(10);
    expect(filterCurrencies('eur').map((c) => c.code)).toEqual(['EUR']);
    expect(filterCurrencies('pound').map((c) => c.code)).toEqual(['GBP']);
    expect(filterCurrencies('€').map((c) => c.code)).toEqual(['EUR']);
    expect(filterCurrencies('kr').map((c) => c.code)).toEqual(expect.arrayContaining(['SEK', 'NOK', 'DKK']));
    expect(filterCurrencies('zzz')).toEqual([]);
  });
});
