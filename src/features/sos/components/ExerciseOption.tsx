import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconTile, Text } from '@/components';
import type { ExerciseDef } from '@/domain/catalog/exercises';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { formatSpoken } from '../logic/timeline';

export interface ExerciseOptionProps {
  exercise: ExerciseDef;
  selected: boolean;
  onPress: () => void;
}

/** One radio card in "Choose exercise": icon tile, title, two-line benefit, radio on the right. */
export function ExerciseOption({ exercise, selected, onPress }: ExerciseOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={`${exercise.title}. ${exercise.subtitle}`}
      accessibilityHint={`About ${formatSpoken(exercise.durationSec)}`}
      testID={`sos-option-${exercise.id}`}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
    >
      {selected ? (
        <LinearGradient
          colors={[withAlpha(colors.accent, 0.26), withAlpha(colors.purple, 0.1)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <IconTile icon={exercise.icon} color={exercise.color} size={48} />
      <View style={styles.body}>
        <Text variant="subheading" numberOfLines={1} style={styles.title}>
          {exercise.title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {exercise.subtitle}
        </Text>
      </View>
      <Radio selected={selected} />
    </Pressable>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && styles.radioOn]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    minHeight: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardSelected: { borderColor: withAlpha(colors.accent, 0.75), borderWidth: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 16 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.accent, borderWidth: 2, backgroundColor: withAlpha(colors.accent, 0.15) },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
});
