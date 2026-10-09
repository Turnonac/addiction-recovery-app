import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors, radius, spacing } from '@/theme';
import type { RegionView } from '../logic';
import { BRAIN_VIEWBOX, BrainIllustration } from './BrainIllustration';
import { BrainMarker } from './BrainMarker';
import { RegionDetailSlot } from './RegionDetailSlot';

export interface BrainVisualProps {
  regions: RegionView[];
  /** Highlighted marker (from a marker or a list tap). */
  selectedId: string | null;
  /** Region whose detail panel is open under the brain (marker and legend taps only). */
  panelId: string | null;
  onMarkerPress: (id: string) => void;
  onClosePanel: () => void;
  /** Habit color, used for the backdrop glow. */
  color: string;
}

/** The brain illustration card: tappable, pulsing region markers over the brain, details in a fixed-height slot below. */
export function BrainVisual({ regions, selectedId, panelId, onMarkerPress, onClosePanel, color }: BrainVisualProps) {
  const glowId = `bglow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View style={styles.card}>
      <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={glowId} cx="50%" cy="42%" r="60%">
              <Stop offset="0" stopColor={color} stopOpacity={0.16} />
              <Stop offset="0.6" stopColor={color} stopOpacity={0.04} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glowId})`} />
        </Svg>
      </View>

      <View style={styles.stage} testID="brain-stage">
        <BrainIllustration />
        {regions.map((r, i) => (
          <BrainMarker
            key={r.id}
            name={r.name}
            color={r.color}
            recovery={r.recovery}
            x={r.x}
            y={r.y}
            selected={r.id === selectedId}
            dimmed={selectedId != null && r.id !== selectedId}
            delay={i * 380}
            onPress={() => onMarkerPress(r.id)}
          />
        ))}
      </View>

      <RegionDetailSlot regions={regions} panelId={panelId} selectedId={selectedId} onSelect={onMarkerPress} onClose={onClosePanel} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
    padding: spacing.md,
  },
  stage: {
    width: '100%',
    aspectRatio: BRAIN_VIEWBOX.width / BRAIN_VIEWBOX.height,
    marginVertical: spacing.lg,
  },
  noTouch: { pointerEvents: 'none' },
});
