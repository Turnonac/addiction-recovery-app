import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { JOURNAL_PROMPTS } from '../logic';

export interface PromptChipsProps {
  onPick: (prompt: string) => void;
}

/** Horizontal row of writing prompts ("Need inspiration?"). */
export function PromptChips({ onPick }: PromptChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row} keyboardShouldPersistTaps="always">
      {JOURNAL_PROMPTS.map((p) => (
        <Pressable
          key={p}
          onPress={() => onPick(p)}
          accessibilityRole="button"
          accessibilityLabel={`Add prompt: ${p}`}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Icon name="lightbulb-on-outline" size={15} color={colors.purple} />
          <Text variant="captionStrong" tone="secondary" numberOfLines={1}>
            {p}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.purple, 0.08),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.purple, 0.3),
  },
  pressed: { backgroundColor: withAlpha(colors.purple, 0.2) },
});
