export interface ConfettiParticle {
  id: number;
  /** Start position (px) relative to the burst origin. */
  startX: number;
  /** Horizontal drift (px) over the whole flight. */
  driftX: number;
  /** How far (px) the particle shoots up before falling. */
  rise: number;
  /** Total fall distance (px) after the rise. */
  fall: number;
  /** Final rotation in degrees (can be negative). */
  spin: number;
  width: number;
  height: number;
  color: string;
  round: boolean;
  delay: number;
  /** Duration (ms) of the rise phase. */
  riseMs: number;
  /** Duration (ms) of the fall phase. */
  fallMs: number;
}

/** Small deterministic PRNG (mulberry32) so a burst renders the same on every render. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable numeric seed from a string (e.g. "habitId:days"). */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface ConfettiOptions {
  count: number;
  seed: number;
  palette: string[];
  /** Screen width/height in px. */
  width: number;
  height: number;
}

/**
 * Particles for a confetti burst from the upper-middle of the screen: each shoots
 * up and outward, then tumbles down past the bottom edge.
 */
export function makeConfetti({ count, seed, palette, width, height }: ConfettiOptions): ConfettiParticle[] {
  const rnd = seededRandom(seed);
  const between = (min: number, max: number) => min + rnd() * (max - min);
  const colorsList = palette.length ? palette : ['#FFFFFF'];
  return Array.from({ length: count }, (_, id) => {
    const round = rnd() < 0.3;
    const size = between(6, 11);
    const direction = rnd() < 0.5 ? -1 : 1;
    return {
      id,
      startX: between(-width * 0.12, width * 0.12),
      driftX: direction * between(width * 0.08, width * 0.55),
      rise: between(height * 0.08, height * 0.3),
      fall: height * between(0.85, 1.05),
      spin: direction * between(360, 1080),
      width: round ? size : size * 0.6,
      height: round ? size : size * 1.5,
      color: colorsList[Math.floor(rnd() * colorsList.length) % colorsList.length],
      round,
      delay: Math.round(between(0, 350)),
      riseMs: Math.round(between(380, 620)),
      fallMs: Math.round(between(1900, 3200)),
    };
  });
}
