export interface BubbleFit {
  /** Width of the row the bubbles sit in. */
  width: number;
  /** Bubbles that must fit on one line. */
  count: number;
  gap: number;
  /** Largest bubble (used whenever there is room). */
  max: number;
  /** Smallest bubble that stays a comfortable tap target. */
  min: number;
}

/** Diameter that lets `count` bubbles share one row of `width` (clamped to [min, max]). */
export function bubbleSize({ width, count, gap, max, min }: BubbleFit): number {
  if (!Number.isFinite(width) || width <= 0 || count <= 0) return max;
  const fit = Math.floor((width - gap * (count - 1)) / count);
  return Math.max(min, Math.min(max, fit));
}
