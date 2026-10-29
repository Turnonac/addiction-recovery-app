import { useColorScheme } from 'react-native';

import type { ColorLevel } from '@/domain/types';

/**
 * Calm look and its dark mode (dark follows the phone's setting).
 * Values match the approved mockups. Text pairs are checked for WCAG AA
 * (4.5:1 body text, 3:1 large text and UI marks).
 */
export interface AppTheme {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  line: string;
  /** Stronger line for input borders, dashed outlines and switch tracks (3:1). */
  line2: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  accentText: string;
  trackOff: string;
  knob: string;
  radius: number;
  cardRadius: number;
  buttonRadius: number;
  levels: Record<ColorLevel, LevelColors>;
}

export interface LevelColors {
  /** Filled circle behind the glyph. */
  solid: string;
  /** Tinted background for a selected card or calendar day. */
  soft: string;
  /** Text on `soft`. */
  ink: string;
  /** Glyph stroke on `solid`. */
  glyphInk: string;
}

export const lightTheme: AppTheme = {
  scheme: 'light',
  bg: '#F4F6F6',
  surface: '#FFFFFF',
  surface2: '#E8EFED',
  text: '#15201E',
  muted: '#55625F',
  line: '#DCE3E1',
  line2: '#7A8885',
  accent: '#2F5D50',
  onAccent: '#FFFFFF',
  accentSoft: '#E1EDE9',
  accentText: '#24493F',
  trackOff: '#7A8885',
  knob: '#FFFFFF',
  radius: 20,
  cardRadius: 16,
  buttonRadius: 14,
  levels: {
    0: { solid: '#2E8B57', soft: '#E1F2E7', ink: '#14532D', glyphInk: '#FFFFFF' },
    1: { solid: '#2F6FD0', soft: '#E2ECFA', ink: '#1E3A8A', glyphInk: '#FFFFFF' },
    2: { solid: '#E0A800', soft: '#FCF1CC', ink: '#664604', glyphInk: '#2E2100' },
    3: { solid: '#D14343', soft: '#FBE3E3', ink: '#7F1D1D', glyphInk: '#FFFFFF' },
  },
};

export const darkTheme: AppTheme = {
  scheme: 'dark',
  bg: '#0D1015',
  surface: '#161A21',
  surface2: '#212733',
  text: '#F1F3F6',
  muted: '#A3ADBB',
  line: '#2A303B',
  line2: '#66727F',
  accent: '#8CC8C0',
  onAccent: '#0B1A18',
  accentSoft: '#173230',
  accentText: '#A9DCD5',
  trackOff: '#5F6A7C',
  knob: '#0D1015',
  radius: 20,
  cardRadius: 16,
  buttonRadius: 14,
  levels: {
    0: { solid: '#3FBF77', soft: '#12291C', ink: '#93E2B4', glyphInk: '#0D1015' },
    1: { solid: '#5B95FF', soft: '#132440', ink: '#A9C8FF', glyphInk: '#0D1015' },
    2: { solid: '#F2C230', soft: '#2F2709', ink: '#F6D873', glyphInk: '#0D1015' },
    3: { solid: '#F05A5A', soft: '#33151A', ink: '#FFA8A8', glyphInk: '#0D1015' },
  },
};

/** SVG path (24x24 box) drawn on each color's circle so color is never the only cue. */
export const LEVEL_GLYPHS: Record<ColorLevel, string> = {
  0: 'M5 12.5l4.5 4.5L19 7.5', // check
  1: 'M4 12c2.7-3.2 5.3-3.2 8 0s5.3 3.2 8 0', // wave
  2: 'M12 6v7.5M12 18v.01', // !
  3: 'M7.5 7.5l9 9M16.5 7.5l-9 9', // x
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

/** Minimum touch target (Apple HIG 44pt). */
export const MIN_TOUCH = 44;

export function useAppTheme(): AppTheme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
