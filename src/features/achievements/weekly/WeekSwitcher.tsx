import { StyleSheet, View } from 'react-native';

import { Icon, IconButton, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';

export interface WeekSwitcherProps {
  range: string;
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * ‹ 5–11 Oct › in a contained glass pill, so its chevrons read as part of the
 * content rather than as a second back button. Can't move into the future or
 * before the first tracked week.
 */
export function WeekSwitcher({ range, label, canPrev, canNext, onPrev, onNext }: WeekSwitcherProps) {
  return (
    <View style={styles.pill}>
      <IconButton
        icon="chevron-left"
        onPress={onPrev}
        disabled={!canPrev}
        accessibilityLabel="Previous week"
        background="transparent"
        size={40}
        iconSize={22}
        color={colors.textSecondary}
      />
      <View style={styles.center} accessible accessibilityRole="header" accessibilityLabel={`${label}, ${range}`}>
        <Text variant="micro" mono tone="tertiary" style={styles.label}>
          {label}
        </Text>
        <View style={styles.rangeRow}>
          <Icon name="calendar-week" size={15} color={colors.accent} />
          <Text variant="bodyStrong" tabular numberOfLines={1}>
            {range}
          </Text>
        </View>
      </View>
      <IconButton
        icon="chevron-right"
        onPress={onNext}
        disabled={!canNext}
        accessibilityLabel="Next week"
        background="transparent"
        size={40}
        iconSize={22}
        color={colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  center: { flex: 1, alignItems: 'center', gap: 2 },
  label: { textTransform: 'uppercase', letterSpacing: 1.6 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
