import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components';
import { TIER_COLORS, TIER_LABELS } from '@/domain/achievements';
import { spacing } from '@/theme';
import { formatPercent } from '@/utils/format';
import { Medal } from './Medal';
import type { AchievementView } from './useAchievements';

export interface AchievementBadgeProps {
  item: AchievementView;
  onPress: (id: string) => void;
  size?: number;
}

/** One cell of the 3-column badge grid: medal, title, tier or progress. */
export function AchievementBadge({ item, onPress, size = 74 }: AchievementBadgeProps) {
  const { def, isUnlocked: unlocked, progress } = item;
  return (
    <Pressable
      onPress={() => onPress(def.id)}
      accessibilityRole="button"
      accessibilityLabel={`${def.title}, ${unlocked ? `${TIER_LABELS[def.tier]} achievement, unlocked` : `locked, ${formatPercent(progress)} complete`}`}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
      testID={`achievement-${def.id}`}
    >
      <Medal icon={def.icon} color={def.color} tier={def.tier} unlocked={unlocked} progress={progress} size={size} />
      <Text variant="captionStrong" center numberOfLines={1} tone={unlocked ? 'primary' : 'secondary'} style={styles.title}>
        {def.title}
      </Text>
      {unlocked ? (
        <Text variant="micro" center color={TIER_COLORS[def.tier]} style={styles.sub}>
          {TIER_LABELS[def.tier]}
        </Text>
      ) : (
        <Text variant="micro" center tone="tertiary" tabular style={styles.sub}>
          {formatPercent(progress)}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { width: '33.333%', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  title: { marginTop: spacing.sm },
  sub: { marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
});
