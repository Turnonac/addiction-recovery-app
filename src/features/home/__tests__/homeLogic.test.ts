import { DAY, HOUR, MINUTE } from '@/domain/time';
import {
  certificateBannerText,
  chipMoney,
  goalLabel,
  goalView,
  shortCount,
  shortMoney,
  certificateHref,
  textEm,
  habitChips,
  savingsIcon,
  streakDisplay,
  streakPhrase,
  summarizeSavings,
  type ChipSource,
} from '../homeLogic';

describe('streakDisplay', () => {
  it('shows whole days once a day has passed', () => {
    expect(streakDisplay(29 * DAY + 3 * HOUR)).toEqual({ value: '29', unit: 'days' });
    expect(streakDisplay(DAY)).toEqual({ value: '1', unit: 'day' });
    expect(streakDisplay(1234 * DAY)).toEqual({ value: '1,234', unit: 'days' });
  });

  it('falls back to hours, then minutes, on day one', () => {
    expect(streakDisplay(5 * HOUR + 20 * MINUTE)).toEqual({ value: '5', unit: 'hours' });
    expect(streakDisplay(HOUR)).toEqual({ value: '1', unit: 'hour' });
    expect(streakDisplay(12 * MINUTE + 30 * 1000)).toEqual({ value: '12', unit: 'min' });
    expect(streakDisplay(MINUTE)).toEqual({ value: '1', unit: 'min' });
  });

  it('shows "<1 min" instead of a dead "0" in the first minute', () => {
    expect(streakDisplay(0)).toEqual({ value: '<1', unit: 'min' });
    expect(streakDisplay(42 * 1000)).toEqual({ value: '<1', unit: 'min' });
    expect(streakDisplay(-5 * MINUTE)).toEqual({ value: '<1', unit: 'min' });
    expect(streakPhrase(42 * 1000)).toBe('less than a minute');
  });

  it('treats a corrupt streak (missing start date) as just started', () => {
    expect(streakDisplay(Number.NaN)).toEqual({ value: '<1', unit: 'min' });
    expect(streakDisplay(Number.POSITIVE_INFINITY)).toEqual({ value: '<1', unit: 'min' });
    expect(streakPhrase(Number.NaN)).toBe('less than a minute');
  });

  it('builds a sentence-friendly phrase', () => {
    expect(streakPhrase(29 * DAY)).toBe('29 days');
    expect(streakPhrase(3 * HOUR)).toBe('3 hours');
    expect(streakPhrase(MINUTE)).toBe('1 minute');
    expect(streakPhrase(12 * MINUTE)).toBe('12 minutes');
  });
});

describe('summarizeSavings', () => {
  it('shows a dash when nothing is tracked', () => {
    expect(summarizeSavings({})).toEqual({ value: '—' });
  });

  it('shows one compact amount for a single currency', () => {
    expect(summarizeSavings({ USD: 124.05 })).toEqual({ value: '$124' });
    expect(summarizeSavings({ USD: 4823 })).toEqual({ value: '$4.8K' });
    expect(summarizeSavings({ USD: 2.1 })).toEqual({ value: '$2.10' });
    expect(summarizeSavings({ USD: 0 })).toEqual({ value: '$0' });
  });

  it('headlines the largest amount and lists the other currencies', () => {
    expect(summarizeSavings({ USD: 124.05, UAH: 4823, EUR: 358.2 })).toEqual({ value: '₴4.8K', sub: '+€358 +$124' });
  });

  it('caps the extra currencies line', () => {
    const s = summarizeSavings({ USD: 500, EUR: 400, GBP: 300, UAH: 200, PLN: 100 });
    expect(s.value).toBe('$500');
    expect(s.sub).toBe('+€400 +£300 …');
  });

  it('labels currencies that share a symbol with their ISO code', () => {
    expect(summarizeSavings({ JPY: 360_000, CNY: 12_000 })).toEqual({ value: '¥360K', sub: '+CNY12K' });
    expect(summarizeSavings({ SEK: 5000, NOK: 3000, DKK: 1000 })).toEqual({ value: 'kr5K', sub: '+NOK3K +DKK1K' });
    expect(summarizeSavings({ USD: 900, JPY: 500, CNY: 400 })).toEqual({ value: '$900', sub: '+JPY500 +CNY400' });
    // "C$" and "$" differ, so no code is needed.
    expect(summarizeSavings({ USD: 100, CAD: 50 })).toEqual({ value: '$100', sub: '+C$50' });
  });

  it('shortens values to fit the summary cell', () => {
    // A 390pt-wide phone: ~99.6px cells, value at 24px, sub line at 10px.
    const fit = { value: 99.6 / 24, sub: 99.6 / 10 };
    // "CHF10K" would fit but loses a digit: the code moves to the label instead.
    expect(summarizeSavings({ CHF: 10_240 }, fit)).toEqual({ value: '10.2K', code: 'CHF' });
    // Too wide even as "MX$13M": the code moves to the label.
    expect(summarizeSavings({ MXN: 12_800_000 }, fit)).toEqual({ value: '12.8M', code: 'MXN' });
    // A 320pt phone has ~76px cells.
    expect(summarizeSavings({ CHF: 10_240 }, { value: 76 / 24, sub: 7.6 })).toEqual({ value: '10.2K', code: 'CHF' });
    expect(summarizeSavings({ MXN: 12_800_000, USD: 10 }, fit)).toEqual({ value: '12.8M', code: 'MXN', sub: '+$10' });
    expect(summarizeSavings({ CHF: 4823 }, fit)).toEqual({ value: '4.8K', code: 'CHF' });
    expect(summarizeSavings({ BRL: 10_200 }, fit)).toEqual({ value: '10.2K', code: 'BRL' });
    // A multi-letter symbol that fits without losing precision stays.
    expect(summarizeSavings({ CHF: 412 }, fit)).toEqual({ value: 'CHF412' });
    // Short values keep their precision.
    expect(summarizeSavings({ USD: 4823, EUR: 358.2 }, fit)).toEqual({ value: '$4.8K', sub: '+€358' });
    // A long sub line drops decimals first, then currencies.
    const many = { USD: 50_000, CZK: 10_000, CHF: 3600 };
    expect(summarizeSavings(many, fit)).toEqual({ value: '$50K', sub: '+Kč10K +CHF3.6K' });
    expect(summarizeSavings(many, { ...fit, sub: 9 })).toEqual({ value: '$50K', sub: '+Kč10K +CHF4K' });
    expect(summarizeSavings(many, { ...fit, sub: 6 })).toEqual({ value: '$50K', sub: '+Kč10K …' });
  });

  it('is as precise on a narrow screen as on a wide one', () => {
    const fit390 = { value: 99.6 / 24, sub: 9.96 };
    const fit320 = { value: 76.3 / 24, sub: 7.63 };
    // Same precision as the habit chip ("CHF3.8K") at both widths.
    expect(chipMoney(3766, 'CHF')).toBe('CHF3.8K');
    expect(summarizeSavings({ CHF: 3766 }, fit390)).toEqual({ value: '3.8K', code: 'CHF' });
    expect(summarizeSavings({ CHF: 3766 }, fit320)).toEqual({ value: '3.8K', code: 'CHF' });
    // One-glyph symbols are worth a digit: "$10K" rather than "10.2K USD".
    expect(summarizeSavings({ USD: 10_240 }, fit320)).toEqual({ value: '$10K' });
    expect(summarizeSavings({ USD: 10_240 }, fit390)).toEqual({ value: '$10.2K' });
    // No value budget (iOS/Android, where the text shrinks itself): full precision.
    expect(summarizeSavings({ CHF: 3766 }, { value: Infinity, sub: 7.63 })).toEqual({ value: 'CHF3.8K' });
  });

  it('leaves currencies with nothing saved out of the sub line', () => {
    expect(summarizeSavings({ USD: 375, EUR: 0 })).toEqual({ value: '$375' });
    expect(summarizeSavings({ USD: 375, EUR: 0.003 })).toEqual({ value: '$375' });
    expect(summarizeSavings({ USD: 375, EUR: 0, GBP: 12 })).toEqual({ value: '$375', sub: '+£12' });
    // Only listed currencies decide whether a symbol needs its code.
    expect(summarizeSavings({ USD: 900, JPY: 500, CNY: 0 })).toEqual({ value: '$900', sub: '+¥500' });
    expect(summarizeSavings({ USD: 0, EUR: 0 })).toEqual({ value: '€0' });
  });

  it('ignores invalid amounts', () => {
    expect(summarizeSavings({ USD: Number.NaN, EUR: 10 })).toEqual({ value: '€10' });
  });

  it('picks an icon for the headline currency', () => {
    expect(savingsIcon({ UAH: 4823, USD: 10 })).toBe('currency-uah');
    expect(savingsIcon({ EUR: 1 })).toBe('currency-eur');
    expect(savingsIcon({ CAD: 1 })).toBe('currency-usd');
    // No dollar sign over "CHF SAVED": currencies without their own icon get cash.
    expect(savingsIcon({ SEK: 1 })).toBe('cash');
    expect(savingsIcon({ CHF: 3766, USD: 10 })).toBe('cash');
    expect(savingsIcon({ USD: Number.NaN, PLN: 5 })).toBe('cash');
    expect(savingsIcon({})).toBe('cash');
  });
});

describe('money formats', () => {
  it('shortens money for the summary', () => {
    expect(shortMoney(4823, 'UAH')).toBe('₴4.8K');
    expect(shortMoney(358.2, 'EUR')).toBe('€358');
    expect(shortMoney(12.5, 'USD')).toBe('$12.50');
    expect(shortMoney(0, 'GBP')).toBe('£0');
    expect(shortMoney(-3, 'USD')).toBe('$0');
    expect(shortMoney(10, 'USD')).toBe('$10');
  });

  it('rounds before picking the unit', () => {
    expect(shortMoney(999.4, 'USD')).toBe('$999');
    expect(shortMoney(999.6, 'USD')).toBe('$1K');
    expect(shortMoney(99.996, 'USD')).toBe('$100');
    expect(shortMoney(999_940, 'USD')).toBe('$999.9K');
    expect(shortMoney(999_960, 'USD')).toBe('$1M');
    expect(shortMoney(1_250_000, 'EUR')).toBe('€1.3M');
  });

  it('picks the most precise form that fits a width budget', () => {
    expect(shortMoney(10_240, 'CHF', { maxEm: 4.1 })).toBe('CHF10K');
    expect(shortMoney(12.5, 'CHF', { maxEm: 4.1 })).toBe('CHF13');
    expect(shortMoney(12.5, 'CHF', { maxEm: 4.4 })).toBe('CHF12.5');
    expect(shortMoney(999, 'MXN', { maxEm: 4.1 })).toBe('MX$1K');
    expect(shortMoney(124_500, 'USD', { maxEm: 4.1 })).toBe('$125K');
    expect(shortMoney(4823, 'UAH', { maxEm: 4.1 })).toBe('₴4.8K');
    // Never jumps to a bigger unit below 1 of it.
    expect(shortMoney(900_000, 'JPY', { maxEm: 1 })).toBe('¥900K');
    // Nothing fits: the narrowest form wins.
    expect(shortMoney(10_240, 'CHF', { maxEm: 1 })).toBe('CHF10K');
  });

  it('shortens counts only when they overflow', () => {
    expect(shortCount(13_278)).toBe('13,278');
    // 99.6px cell at 390pt: fits in full.
    expect(shortCount(13_278, 99.6 / 24)).toBe('13,278');
    // 76px cell at 320pt: "13,278" is ~84px.
    expect(shortCount(13_278, 76.3 / 24)).toBe('13.3K');
    expect(shortCount(9999, 76.3 / 24)).toBe('9,999');
    expect(shortCount(1_250_000, 76.3 / 24)).toBe('1.3M');
    expect(shortCount(42, 0)).toBe('42');
    expect(shortCount(Number.NaN)).toBe('0');
    expect(shortCount(-3)).toBe('0');
  });

  it('can label the amount with a currency code', () => {
    expect(shortMoney(12_000, 'CNY', { label: 'CNY' })).toBe('CNY12K');
  });

  it('estimates text width', () => {
    expect(textEm('$1')).toBeCloseTo(1.31);
    expect(textEm('CHF10.2K')).toBeGreaterThan(textEm('CHF10K'));
  });

  it('shows cents on chips below a thousand', () => {
    expect(chipMoney(124.05, 'USD')).toBe('$124.05');
    expect(chipMoney(4823, 'UAH')).toBe('₴4.8K');
    expect(chipMoney(Number.NaN, 'USD')).toBe('$0.00');
    expect(chipMoney(999_960, 'USD')).toBe('$1M');
  });
});

describe('habitChips', () => {
  const base: ChipSource = {
    habit: { dailyCost: 0, dailyMinutes: 0, currency: 'USD' },
    moneySaved: 0,
    minutesSaved: 0,
    attempt: 1,
    isRecord: false,
  };

  it('shows money saved when cost is tracked', () => {
    const chips = habitChips({ ...base, habit: { ...base.habit, dailyCost: 4, dailyMinutes: 15 }, moneySaved: 124.05, isRecord: true });
    expect(chips.map((c) => [c.kind, c.label])).toEqual([
      ['money', '$124.05'],
      ['record', 'Record'],
    ]);
  });

  it('falls back to time saved when only minutes are tracked', () => {
    const chips = habitChips({ ...base, habit: { ...base.habit, dailyMinutes: 150 }, minutesSaved: 150 * 6.2, attempt: 3 });
    expect(chips.map((c) => [c.kind, c.label])).toEqual([
      ['time', '15h 30m'],
      ['attempt', 'Attempt 3'],
    ]);
  });

  it('shows the attempt chip when there is nothing else', () => {
    expect(habitChips(base).map((c) => c.label)).toEqual(['Attempt 1']);
  });
});

describe('goalLabel', () => {
  it('shows days, and years for yearly goals', () => {
    expect(goalLabel(30)).toBe('30 days');
    expect(goalLabel(1)).toBe('1 day');
    expect(goalLabel(1000)).toBe('1,000 days');
    expect(goalLabel(365)).toBe('1 year');
    expect(goalLabel(1460)).toBe('4 years');
  });

  it('never shows NaN for a corrupt streak', () => {
    expect(goalLabel(Number.NaN)).toBe('1 day');
    expect(goalView({ goalDays: Number.NaN, progress: Number.NaN })).toEqual({ goalDays: 1, progress: 0 });
    expect(goalView({ goalDays: 30, progress: 0.96 })).toEqual({ goalDays: 30, progress: 0.96 });
    expect(goalView({ goalDays: 30, progress: 1.4 })).toEqual({ goalDays: 30, progress: 1 });
  });
});

describe('certificate banner', () => {
  it('describes the milestone', () => {
    expect(certificateBannerText({ days: 30, habitName: 'Alcohol' })).toBe('1 month free from Alcohol – tap to receive your certificate');
    expect(certificateBannerText({ days: 7, habitName: 'Coffee' })).toBe('1 week free from Coffee – tap to receive your certificate');
  });

  it('links to the certificate screen', () => {
    expect(certificateHref({ habitId: 'demo_alcohol', days: 30 })).toBe('/certificate?habitId=demo_alcohol&days=30');
  });
});
