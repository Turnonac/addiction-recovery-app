import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import type { MoodDef } from '@/domain/catalog/moods';
import { radius, spacing, withAlpha } from '@/theme';

/** Mood pill: weather icon + label in the mood color. */
export function MoodBadge({ mood }: { mood: MoodDef }) {
  return (
    <View
      style={[styles.badge, { backgroundColor: withAlpha(mood.color, 0.16), borderColor: withAlpha(mood.color, 0.45) }]}
      accessibilityLabel={`Mood: ${mood.label}`}
      testID="journal-mood-badge"
    >
      <Icon name={mood.icon} size={16} color={mood.color} />
      <Text variant="captionStrong" color={mood.color}>
        {mood.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
