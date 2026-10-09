import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, ProgressBar, ProgressRing, Text } from '@/components';
import { TIER_COLORS, TIER_LABELS, TIER_ORDER, progressText } from '@/domain/achievements';
import { colors, spacing, withAlpha } from '@/theme';
import { Medal } from './Medal';
import type { AchievementView } from './useAchievements';

export interface AchievementSummaryProps {
  items: AchievementView[];
  next: AchievementView | null;
  onOpen: (id: string) => void;
}

/** Top card: unlocked ring, tier counts and the closest locked achievement. */
export function AchievementSummary({ items, next, onOpen }: AchievementSummaryProps) {
  const unlocked = items.filter((i) => i.isUnlocked);
  const total = items.length;
  const tierCounts = TIER_ORDER.map((tier) => ({ tier, n: unlocked.filter((i) => i.def.tier === tier).length }));

  return (
    <Card tint={colors.gold} tintStrength={0.05} padding={0}>
      <View style={styles.top}>
        <ProgressRing progress={total ? unlocked.length / total : 0} size={96} strokeWidth={9} color={colors.gold}>
          <Text variant="heading" tabular style={styles.ringValue}>
            {unlocked.length}
          </Text>
          <Text variant="micro" tone="tertiary" tabular>
            of {total}
          </Text>
        </ProgressRing>
        <View style={styles.topText}>
          <Text variant="subheading" accessibilityRole="header">
            {unlocked.length} of {total} unlocked
          </Text>
          <Text variant="caption" tone="secondary">
            {unlocked.length === total ? 'Every badge earned. Legendary.' : unlocked.length === 0 ? 'Your first badge is closer than you think.' : 'Every badge is a step you took.'}
          </Text>
          <View style={styles.tiers}>
            {tierCounts.map(({ tier, n }) => (
              <View key={tier} style={styles.tier} accessible accessibilityLabel={`${TIER_LABELS[tier]}: ${n}`}>
                <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[tier], opacity: n ? 1 : 0.35 }]} />
                <Text variant="captionStrong" tabular tone={n ? 'primary' : 'tertiary'}>
                  {n}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {next ? (
        <Pressable
          onPress={() => onOpen(next.def.id)}
          accessibilityRole="button"
          accessibilityLabel={`Next up: ${next.def.title}. ${progressText(next)}`}
          style={({ pressed }) => [styles.next, pressed && { backgroundColor: colors.cardPressed }]}
        >
          <Text variant="overline" tone="tertiary" style={styles.nextLabel}>
            Next up
          </Text>
          <View style={styles.nextRow}>
            <Medal icon={next.def.icon} color={next.def.color} tier={next.def.tier} unlocked={false} progress={next.progress} size={48} showLock={false} />
            <View style={styles.nextText}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {next.def.title}
              </Text>
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {next.def.description}
              </Text>
              {/* Progress gets its own line under the text so neither it nor the title is cut on narrow phones. */}
              <View style={styles.progressRow}>
                <ProgressBar progress={next.progress} color={TIER_COLORS[next.def.tier]} height={6} style={styles.bar} />
                <Text variant="caption" tone="secondary" tabular numberOfLines={1} style={styles.progressText}>
                  {progressText(next)}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
          </View>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  ringValue: { fontSize: 26, lineHeight: 28 },
  topText: { flex: 1, gap: 4 },
  tiers: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tierDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: withAlpha(colors.text, 0.25) },
  next: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  nextLabel: { fontSize: 10, marginBottom: spacing.sm },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nextText: { flex: 1, gap: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  bar: { flex: 1 },
  progressText: { flexShrink: 0, maxWidth: '60%' },
});
