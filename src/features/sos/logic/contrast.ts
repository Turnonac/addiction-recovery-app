/**
 * WCAG 2.x contrast helpers used to pick a readable label (white or black) for
 * buttons and badges filled with a bright exercise color.
 */

/** Minimum contrast for normal-size text (WCAG AA). */
export const AA_TEXT = 4.5;

/** Label tone on a fill: `light` = white text, `dark` = black text. */
export type LabelTone = 'light' | 'dark';

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** "#RGB" / "#RRGGBB" → [r, g, b] (0–255), or null if it isn't a hex color. */
export function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance (0 = black, 1 = white). Unknown colors count as mid-grey. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.2;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio of white text on a fill (1–21). */
export function contrastWithWhite(fill: string): number {
  return 1.05 / (luminance(fill) + 0.05);
}

/** Contrast ratio of black text on a fill (1–21). */
export function contrastWithBlack(fill: string): number {
  return (luminance(fill) + 0.05) / 0.05;
}

/**
 * Label tone that stays readable on every given fill (e.g. both stops of a
 * gradient). White is kept whenever it meets `min` everywhere; otherwise the
 * tone with the better worst-case contrast wins.
 */
export function labelToneOn(fills: string | readonly string[], min: number = AA_TEXT): LabelTone {
  const list = typeof fills === 'string' ? [fills] : fills;
  if (list.length === 0) return 'light';
  const white = Math.min(...list.map(contrastWithWhite));
  if (white >= min) return 'light';
  const black = Math.min(...list.map(contrastWithBlack));
  return black > white ? 'dark' : 'light';
}
