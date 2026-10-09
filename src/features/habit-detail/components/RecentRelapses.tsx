import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, IconTile, SectionHeader, Text } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import { MINUTE } from '@/domain/time';
import { colors, spacing } from '@/theme';
import { streakAdjective } from '@/features/relapse/relapseLogic';
import { relativeDateTimeLabel, type StreakItem } from '../logic';
import { TriggerChips } from './RelapseMeta';

export interface RecentRelapsesProps {
  habitId: string;
  color: string;
  /** Ended streaks, newest first (already limited). */
  items: StreakItem[];
  /** Total relapses, for the header counter. */
  total: number;
  now: number;
}

/** "HISTORY" — the last couple of relapses with a link to the full streak history. */
export function RecentRelapses({ habitId, color, items, total, now }: RecentRelapsesProps) {
  const openHistory = () => router.push(`/habit/${habitId}/history`);
  return (
    <View>
      <SectionHeader
        icon="history"
        title="HISTORY"
        right={
          <Pressable onPress={openHistory} accessibilityRole="link" accessibilityLabel="See all streaks" hitSlop={10} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Text variant="captionStrong" color={color}>
              See all
            </Text>
            <Icon name="chevron-right" size={16} color={color} />
          </Pressable>
        }
      />
      {items.length === 0 ? (
        <Card onPress={openHistory} accessibilityLabel="No relapses. Keep going! Open streak history">
          <View style={styles.emptyRow}>
            <IconTile icon="shield-check-outline" color={colors.success} size={40} shape="circle" />
            <View style={styles.flex}>
              <Text variant="bodyStrong">No relapses — keep going!</Text>
              <Text variant="caption" tone="secondary">
                Every day of this streak is a new personal best.
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((it) => (
            <RelapseRow key={it.relapse?.id ?? it.attempt} item={it} now={now} onPress={openHistory} />
          ))}
          {total > items.length ? (
            <Text variant="caption" tone="tertiary" center style={styles.more}>
              {`${total - items.length} earlier ${total - items.length === 1 ? 'relapse' : 'relapses'} in history`}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function RelapseRow({ item, now, onPress }: { item: StreakItem; now: number; onPress: () => void }) {
  const r = item.relapse;
  if (!r) return null;
  const mood = r.mood ? moodFor(r.mood) : null;
  const when = relativeDateTimeLabel(r.at, now);
  // A relapse logged right after restarting ended no real streak ("0-minute" would read oddly).
  const title =
    item.ms >= MINUTE
      ? `Ended a ${streakAdjective(item.ms)} streak`
      : item.attempt === 1
        ? 'Relapsed right after starting'
        : 'Relapsed again right after restarting';
  return (
    <Card onPress={onPress} padding={spacing.md + 2} accessibilityLabel={`Relapse: ${when}. ${title}`}>
      <View style={styles.row}>
        <IconTile icon={mood ? mood.icon : 'restore'} color={mood ? mood.color : colors.fire} size={40} />
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
              {title}
            </Text>
            {item.isRecord ? <Icon name="trophy" size={14} color={colors.gold} /> : null}
          </View>
          <Text variant="caption" tone="tertiary">
            {when}
          </Text>
          {r.triggers.length ? (
            <View style={styles.chips}>
              <TriggerChips triggers={r.triggers} max={3} />
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pressed: { opacity: 0.6 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chips: { marginTop: spacing.sm },
  more: { marginTop: spacing.xs },
});
