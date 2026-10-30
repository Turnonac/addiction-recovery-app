import { Text, View } from 'react-native';

import { COLOR_LEVELS, COLOR_NAMES, type ColorLevel } from '@/domain/types';
import { ColorGlyph } from '@/ui/components/ColorGlyph';
import { useAppTheme } from '@/ui/theme';

export interface ColorTotalsProps {
  /** Days per color, e.g. `monthSummary(...).counts`. */
  counts: Record<ColorLevel, number>;
}

function daysText(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/** History's month totals: proportional color bar plus a 2-column legend with glyphs and counts. */
export function ColorTotals({ counts }: ColorTotalsProps) {
  const theme = useAppTheme();
  const total = COLOR_LEVELS.reduce<number>((sum, level) => sum + counts[level], 0);
  return (
    <View style={{ gap: 12 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: 'row',
          gap: 2,
          height: 10,
          borderRadius: 5,
          overflow: 'hidden',
          backgroundColor: total === 0 ? theme.line : 'transparent',
        }}
      >
        {COLOR_LEVELS.filter((level) => counts[level] > 0).map((level) => (
          <View
            key={level}
            style={{ flexGrow: counts[level], flexBasis: 0, backgroundColor: theme.levels[level].solid }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 12 }}>
        {COLOR_LEVELS.map((level) => (
          <View
            key={level}
            accessible
            accessibilityLabel={`${COLOR_NAMES[level]}: ${daysText(counts[level])}`}
            style={{
              flexBasis: '40%',
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ColorGlyph level={level} size={20} />
            <Text style={{ flex: 1, color: theme.text, fontSize: 14 }}>{COLOR_NAMES[level]}</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
              {daysText(counts[level])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
