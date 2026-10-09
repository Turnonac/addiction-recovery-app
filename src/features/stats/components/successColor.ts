import { colors } from '@/theme';

/** Success-rate color: green when mostly clean, amber in between, red when struggling. */
export function successColor(rate: number): string {
  if (rate >= 0.8) return colors.success;
  if (rate >= 0.5) return colors.warning;
  return colors.danger;
}
