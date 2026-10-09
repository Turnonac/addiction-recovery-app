import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, Text } from '@/components';
import { MOODS, type MoodDef } from '@/domain/catalog/moods';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, withAlpha } from '@/theme';
import type { MoodId } from '@/types';
import { pickerRingSize } from '../logic';

const CIRCLE = 50;
const RING_GAP = 3;
const RING_WIDTH = 2;
const RING = CIRCLE + (RING_GAP + RING_WIDTH) * 2;
const ICON = 24;
const SELECTED_SCALE = 1.1;
const SPRING = { damping: 14, stiffness: 220, mass: 0.6 };

export interface MoodPickerProps {
  value: MoodId;
  onChange: (mood: MoodId) => void;
}

/** Five large weather-mood buttons; the selected one scales up with a colored ring. */
export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const haptic = useHaptics();
  // Until the row is measured, assume the screen's side gutters.
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const ring = pickerRingSize(rowWidth || windowWidth - 2 * spacing.lg, MOODS.length, RING, SELECTED_SCALE);
  return (
    <View
      style={styles.row}
      onLayout={(e) => setRowWidth(Math.floor(e.nativeEvent.layout.width))}
      accessibilityRole="radiogroup"
      accessibilityLabel="How are you feeling?"
    >
      {MOODS.map((m) => (
        <MoodButton
          key={m.id}
          mood={m}
          ring={ring}
          selected={m.id === value}
          onPress={() => {
            if (m.id !== value) haptic('selection');
            onChange(m.id);
          }}
        />
      ))}
    </View>
  );
}

function MoodButton({ mood, ring, selected, onPress }: { mood: MoodDef; ring: number; selected: boolean; onPress: () => void }) {
  const scale = useSharedValue(selected ? SELECTED_SCALE : 1);
  useEffect(() => {
    scale.value = withSpring(selected ? SELECTED_SCALE : 1, SPRING);
  }, [selected, scale]);
  const circle = ring - (RING_GAP + RING_WIDTH) * 2;
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      aria-checked={selected}
      accessibilityLabel={mood.label}
      testID={`mood-${mood.id}`}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.ring, { width: ring, height: ring, borderRadius: ring / 2, borderColor: selected ? mood.color : 'transparent' }, animated]}>
        <View
          style={[
            styles.circle,
            {
              width: circle,
              height: circle,
              borderRadius: circle / 2,
              backgroundColor: withAlpha(mood.color, selected ? 0.26 : 0.1),
              borderColor: withAlpha(mood.color, selected ? 0.6 : 0.22),
            },
          ]}
        >
          <Icon name={mood.icon} size={Math.round((ICON * circle) / CIRCLE)} color={selected ? mood.color : withAlpha(mood.color, 0.75)} />
        </View>
      </Animated.View>
      <Text variant={selected ? 'captionStrong' : 'caption'} color={selected ? mood.color : colors.textTertiary} numberOfLines={1}>
        {mood.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: spacing.xs },
  button: { flex: 1, alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.8 },
  ring: {
    borderWidth: RING_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
