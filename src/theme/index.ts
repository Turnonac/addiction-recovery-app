import { Platform } from 'react-native';

/**
 * Dark-first design tokens. The app is dark-only (like the original), so there is
 * a single palette. Cards are translucent white layers over a near-black canvas,
 * with per-habit accent colors used for glows, bars and rings.
 */
export const colors = {
  bg: '#07070A',
  bgElevated: '#0F0F14',
  card: 'rgba(255,255,255,0.045)',
  cardStrong: 'rgba(255,255,255,0.08)',
  cardPressed: 'rgba(255,255,255,0.11)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  overlay: 'rgba(0,0,0,0.6)',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.62)',
  textTertiary: 'rgba(255,255,255,0.38)',
  textInverse: '#000000',

  accent: '#6366F1', // indigo — primary actions, active segments
  accentSoft: 'rgba(99,102,241,0.18)',
  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.16)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.16)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.16)',
  fire: '#F97316',
  fireSoft: 'rgba(249,115,22,0.18)',
  gold: '#EAB308',
  goldSoft: 'rgba(234,179,8,0.14)',
  info: '#0EA5E9',
  infoSoft: 'rgba(14,165,233,0.16)',
  purple: '#A855F7',
  purpleSoft: 'rgba(168,85,247,0.16)',
  pink: '#EC4899',

  /** SOS button gradient */
  sosStart: '#FF6A00',
  sosEnd: '#FF0050',
} as const;

/** Accent colors a habit can use. Order matters: presets reference these by key. */
export const habitColors = {
  red: '#EF4444',
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#EAB308',
  lime: '#84CC16',
  green: '#22C55E',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  purple: '#A855F7',
  pink: '#EC4899',
  rose: '#F43F5E',
  brown: '#B45309',
  slate: '#94A3B8',
} as const;

export type HabitColorKey = keyof typeof habitColors;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, monospace' }),
} as const;

export const type = {
  hero: { fontSize: 64, fontWeight: '800', letterSpacing: -2 },
  display: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '700' },
  subheading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  captionStrong: { fontSize: 13, fontWeight: '600' },
  /** Small uppercase mono label, e.g. "HEALTH RECOVERY" */
  overline: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', fontFamily: fonts.mono },
  micro: { fontSize: 10, fontWeight: '600' },
} as const;

/** Convert "#RRGGBB" to an rgba() string with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const theme = { colors, habitColors, spacing, radius, fonts, type, withAlpha };
export type Theme = typeof theme;
