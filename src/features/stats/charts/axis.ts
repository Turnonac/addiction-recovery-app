import { colors, fonts } from '@/theme';

/** Shared look for tiny mono axis labels and faint gridlines. */
export const AXIS_FONT = { fontFamily: fonts.mono, fontSize: 9 } as const;
export const AXIS_COLOR = colors.textTertiary;
export const GRID_COLOR = 'rgba(255,255,255,0.07)';
