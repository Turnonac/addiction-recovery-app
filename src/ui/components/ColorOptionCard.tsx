import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  COLOR_MEANINGS,
  COLOR_NAMES,
  LOCKED_RED_LINE,
  RED,
  type ColorLevel,
} from '@/domain/types';
import { ColorGlyph } from '@/ui/components/ColorGlyph';
import { useAppTheme } from '@/ui/theme';

export interface ColorOptionCardProps {
  level: ColorLevel;
  selected: boolean;
  /**
   * The user's behaviors for this color, shown as one line joined with " · ".
   * For Red, LOCKED_RED_LINE is always shown first (added here if missing).
   */
  behaviors: readonly string[];
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

const GLYPH_SIZE = 34;
const GLYPH_GAP = 12;

/**
 * Radio-style card for picking a day's lowest color: glyph, name, fixed
 * meaning, the user's behaviors and a radio mark. Put the cards inside a
 * `ColorOptionGroup` so screen readers announce them as one radio group.
 */
export function ColorOptionCard({
  level,
  selected,
  behaviors,
  onPress,
  disabled = false,
  testID,
}: ColorOptionCardProps) {
  const theme = useAppTheme();
  const colors = theme.levels[level];
  const name = COLOR_NAMES[level];
  const meaning = COLOR_MEANINGS[level];
  const lines =
    level === RED && behaviors[0] !== LOCKED_RED_LINE ? [LOCKED_RED_LINE, ...behaviors] : behaviors;
  const listText = lines.join(' · ');
  const subColor = selected ? colors.ink : theme.muted;

  const a11yLabel = [name, meaning, lines.join(', ')].filter((s) => s.length > 0).join('. ');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={a11yLabel}
      testID={testID}
      style={({ pressed }) => ({
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: selected ? colors.soft : theme.surface,
        borderWidth: 2,
        borderColor: selected ? colors.solid : theme.line,
        borderRadius: theme.cardRadius,
        opacity: pressed ? 0.85 : disabled ? 0.6 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: GLYPH_GAP }}>
        <ColorGlyph level={level} size={GLYPH_SIZE} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{name}</Text>
          <Text style={{ color: subColor, fontSize: 13.5, lineHeight: 18 }}>{meaning}</Text>
        </View>
        <RadioMark selected={selected} level={level} />
      </View>
      {listText.length > 0 ? (
        <Text
          style={{
            color: subColor,
            fontSize: 13,
            lineHeight: 18,
            paddingLeft: GLYPH_SIZE + GLYPH_GAP,
          }}
        >
          {listText}
        </Text>
      ) : null}
    </Pressable>
  );
}

function RadioMark({ selected, level }: { selected: boolean; level: ColorLevel }) {
  const theme = useAppTheme();
  const colors = theme.levels[level];
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle
        cx={12}
        cy={12}
        r={10}
        fill={selected ? colors.solid : 'none'}
        stroke={selected ? colors.solid : theme.muted}
        strokeWidth={2}
      />
      {selected ? (
        <Path
          d="M7.5 12.5l3 3 6-6.5"
          fill="none"
          stroke={colors.glyphInk}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

export interface ColorOptionGroupProps {
  /** e.g. "Lowest color today, best to lowest". */
  accessibilityLabel: string;
  children?: ReactNode;
}

/** Stack of ColorOptionCards announced as a radio group. */
export function ColorOptionGroup({ accessibilityLabel, children }: ColorOptionGroupProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ gap: 8 }}>
      {children}
    </View>
  );
}
