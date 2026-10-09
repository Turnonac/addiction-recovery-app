import { StyleSheet, View } from 'react-native';

import { Card, Chip, Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import { rangeLabel, streakLabel, type StreakItem } from '../logic';
import { MoodBadge, TriggerChips } from '../components/RelapseMeta';

export interface StreakCardProps {
  item: StreakItem;
  color: string;
  now: number;
}

/** One attempt in the history list: duration, dates, and what ended it. */
export function StreakCard({ item, color, now }: StreakCardProps) {
  const r = item.relapse;
  const accent = item.current ? color : item.isRecord ? colors.gold : withAlpha(colors.text, 0.18);
  // Same day-based format as the chart and summary above ("33d", "5h").
  const duration = streakLabel(item.ms);
  const range = rangeLabel(item.startAt, item.endAt, item.current, now);
  return (
    <Card
      padding={spacing.md + 2}
      tint={item.current ? color : undefined}
      tintStrength={0.07}
      accessibilityLabel={`Attempt ${item.attempt}${item.current ? ', current' : ''}${item.isRecord ? ', record' : ''}. ${duration}, ${range.replace('→', 'to')}`}
      testID={`streak-${item.attempt}`}
    >
      <View style={styles.row}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
              {`Attempt ${item.attempt}`}
              {item.current ? (
                <Text variant="bodyStrong" color={color}>
                  {' · current'}
                </Text>
              ) : null}
            </Text>
            <Text variant="subheading" tabular color={item.current ? color : colors.text} style={styles.duration}>
              {duration}
            </Text>
          </View>
          {/* The Record chip sits with the dates so the title row never truncates on narrow phones. */}
          <View style={styles.subRow}>
            <Text variant="caption" tone="tertiary" tabular style={styles.range}>
              {range}
            </Text>
            {item.isRecord ? <Chip label="Record" icon="trophy" color={colors.gold} /> : null}
          </View>
          {r && (r.triggers.length || r.mood) ? (
            <View style={styles.metaRow}>
              <View style={styles.flex}>
                <TriggerChips triggers={r.triggers} />
              </View>
              {r.mood ? <MoodBadge mood={r.mood} /> : null}
            </View>
          ) : null}
          {r?.note ? (
            <Text variant="caption" tone="secondary" style={styles.note}>
              {r.note}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  accent: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1 },
  duration: { marginLeft: 'auto' },
  subRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: 4 },
  range: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  note: { marginTop: 2, fontStyle: 'italic', lineHeight: 18 },
});
