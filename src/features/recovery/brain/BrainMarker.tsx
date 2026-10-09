import { Pressable, StyleSheet, View } from 'react-native';

import { colors, withAlpha } from '@/theme';
import { PulseHalo } from '../shared/PulseHalo';

/** Touch target of a marker (the visible dot is smaller). */
export const MARKER_HIT = 36;

export interface BrainMarkerProps {
  name: string;
  color: string;
  /** 0..1 */
  recovery: number;
  /** 0..1 position within the illustration. */
  x: number;
  y: number;
  selected: boolean;
  /** Another marker is selected (this one is dimmed). */
  dimmed: boolean;
  /** Stagger for the pulse so markers don't beat in unison. */
  delay: number;
  onPress: () => void;
}

/**
 * Glowing dot placed on the brain illustration. Size and brightness grow with
 * recovery; regions still recovering pulse, fully recovered ones glow steadily.
 */
export function BrainMarker({ name, color, recovery, x, y, selected, dimmed, delay, onPress }: BrainMarkerProps) {
  const r = Math.max(0, Math.min(1, recovery));
  const dot = Math.round(10 + 6 * r) + (selected ? 4 : 0);
  const recovered = r >= 1;
  const opacity = dimmed ? 0.35 : 0.6 + 0.4 * r;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${Math.floor(r * 100)}% recovered`}
      // A toggle button: native gets the "selected" trait, web gets aria-pressed
      // (aria-selected is not allowed on role=button, and react-native-web drops accessibilityState).
      accessibilityState={{ selected }}
      aria-pressed={selected}
      style={[styles.hit, { left: `${x * 100}%`, top: `${y * 100}%`, opacity }]}
    >
      <PulseHalo size={dot + 4} color={color} maxScale={selected ? 2.8 : 2.3} peakOpacity={0.6} duration={2200} delay={delay} active={!recovered && !dimmed} />
      <View
        style={[
          styles.glow,
          {
            width: dot + 14,
            height: dot + 14,
            borderRadius: (dot + 14) / 2,
            backgroundColor: withAlpha(color, recovered ? 0.35 : 0.22),
            boxShadow: `0 0 ${selected ? 22 : 14}px ${withAlpha(color, 0.75)}`,
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: color,
            borderWidth: selected ? 2.5 : 1.5,
            borderColor: selected ? colors.text : withAlpha(colors.text, 0.55),
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    width: MARKER_HIT,
    height: MARKER_HIT,
    marginLeft: -MARKER_HIT / 2,
    marginTop: -MARKER_HIT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute' },
  dot: {},
});
