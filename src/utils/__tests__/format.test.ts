import { DAY, HOUR, MINUTE } from '@/domain/time';
import { formatCompact, formatDurationShort, formatMoney, formatPercent } from '../format';

describe('format', () => {
  it('compacts numbers', () => {
    expect(formatCompact(4823)).toBe('4.8K');
    expect(formatCompact(1000)).toBe('1K');
    expect(formatCompact(950)).toBe('950');
    expect(formatCompact(12.5)).toBe('12.5');
    expect(formatCompact(1_250_000)).toBe('1.3M');
  });

  it('rolls over unit boundaries after rounding', () => {
    expect(formatCompact(999.6)).toBe('1K');
    expect(formatCompact(999_950)).toBe('1M');
    expect(formatCompact(999.4)).toBe('999');
    expect(formatCompact(Number.NaN)).toBe('0');
  });

  it('formats money', () => {
    expect(formatMoney(124.05, 'USD')).toBe('$124.05');
    expect(formatMoney(4800, 'UAH', { compact: true })).toBe('₴4.8K');
  });

  it('formats durations', () => {
    expect(formatDurationShort(58 * DAY)).toBe('1mo 28d');
    expect(formatDurationShort(3 * DAY + 4 * HOUR)).toBe('3d 4h');
    expect(formatDurationShort(5 * HOUR + 12 * MINUTE)).toBe('5h 12m');
    expect(formatDurationShort(30 * 1000)).toBe('<1m');
  });

  it('floors percentages', () => {
    expect(formatPercent(29 / 30)).toBe('96%');
    expect(formatPercent(1.4)).toBe('100%');
  });
});
