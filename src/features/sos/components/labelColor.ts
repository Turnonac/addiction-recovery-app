import { colors } from '@/theme';
import { labelToneOn } from '../logic/contrast';

/** White or black, whichever stays readable (WCAG AA) on the given solid fill(s). */
export function labelColorOn(fill: string | readonly string[]): string {
  return labelToneOn(fill) === 'dark' ? colors.textInverse : colors.text;
}
