import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

export interface GlowBackgroundProps {
  /** Accent hex for the glow at the top of the screen (e.g. the habit color). */
  color?: string;
  /** 0..1 */
  intensity?: number;
}

/**
 * Near-black canvas with a soft radial glow from the top, like the original's
 * habit-tinted backgrounds. Render as the first child of a screen.
 */
export function GlowBackground({ color = '#5B4636', intensity = 0.5 }: GlowBackgroundProps) {
  // Unique per instance: stacked screens on web share one DOM, and duplicate
  // gradient ids would make every screen use the first screen's color.
  const gradId = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="0%" r="75%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={intensity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={intensity * 0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>
    </View>
  );
}
