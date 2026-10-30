import Svg, { Circle, G, Path } from 'react-native-svg';

import { COLOR_LEVELS, COLOR_NAMES, type ColorLevel } from '@/domain/types';
import { LEVEL_GLYPHS, useAppTheme } from '@/ui/theme';

export interface ColorGlyphProps {
  /** Color to draw, or null for "not logged" (dashed ring). */
  level: ColorLevel | null;
  /** Diameter in points. Default 32. */
  size?: number;
  /**
   * Makes the glyph a labelled image for screen readers. Omit when nearby text
   * (or the parent control's label) already names the color.
   */
  accessibilityLabel?: string;
}

/**
 * A color circle with its glyph (check / wave / ! / x), so color is never the
 * only cue. `level = null` draws the dashed "not logged" ring.
 */
export function ColorGlyph({ level, size = 32, accessibilityLabel }: ColorGlyphProps) {
  const theme = useAppTheme();
  const labelled = accessibilityLabel !== undefined;
  // Small circles get a slightly heavier glyph so it stays legible.
  const glyphStroke = size <= 22 ? 3 : 2.6;
  const colors = level === null ? null : theme.levels[level];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
    >
      {level === null || colors === null ? (
        <Circle
          cx={16}
          cy={16}
          r={14.5}
          fill="none"
          stroke={theme.muted}
          strokeWidth={1.5}
          strokeDasharray={[3, 3]}
        />
      ) : (
        <>
          <Circle cx={16} cy={16} r={15} fill={colors.solid} />
          <G transform="translate(4 4)">
            <Path
              d={LEVEL_GLYPHS[level]}
              fill="none"
              stroke={colors.glyphInk}
              strokeWidth={glyphStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        </>
      )}
    </Svg>
  );
}

/** Default label for a glyph: 'Green', or 'Not logged' for null. */
export function colorLabel(level: ColorLevel | null): string {
  return level === null ? 'Not logged' : COLOR_NAMES[level];
}

export interface ColorDotsProps {
  /** Box size in points. Default 38. */
  size?: number;
}

/** Decorative 2x2 grid of the four colors (the "My colors" row icon). */
export function ColorDots({ size = 38 }: ColorDotsProps) {
  const theme = useAppTheme();
  // Mockup: 38 box, 7 padding, 4 gap -> 10pt dots.
  const centers: [number, number][] = [
    [12, 12],
    [26, 12],
    [12, 26],
    [26, 26],
  ];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 38 38"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {COLOR_LEVELS.map((level, i) => (
        <Circle
          key={level}
          cx={centers[i][0]}
          cy={centers[i][1]}
          r={5}
          fill={theme.levels[level].solid}
        />
      ))}
    </Svg>
  );
}
