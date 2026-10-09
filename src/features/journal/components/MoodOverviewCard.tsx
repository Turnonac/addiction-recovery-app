import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Card, Icon, IconTile, Text } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import { colors, fonts, spacing, withAlpha } from '@/theme';
import type { JournalEntry } from '@/types';
import { formatDateShort, formatWeekday } from '@/utils/format';
import { MOOD_STRIP_DAYS, averageMood, moodStrip, stripDotSize, type MoodDay } from '../logic';

const CARD_PADDING = spacing.lg;

export interface MoodOverviewCardProps {
  entries: readonly JournalEntry[];
  now: number;
}

/** Average mood + entry count, and the last 14 days as mood dots. */
export function MoodOverviewCard({ entries, now }: MoodOverviewCardProps) {
  const avg = averageMood(entries);
  const days = moodStrip(entries, now, MOOD_STRIP_DAYS);
  const logged = days.filter((d) => d.mood).length;
  const mood = avg?.mood;
  // Until the strip is measured, assume screen gutters + card padding on both sides.
  const { width: windowWidth } = useWindowDimensions();
  const [stripWidth, setStripWidth] = useState(0);
  const dot = stripDotSize(stripWidth || windowWidth - 2 * (spacing.lg + CARD_PADDING));

  return (
    <Card padding={CARD_PADDING} testID="journal-overview">
      <View style={styles.top}>
        {mood ? <IconTile icon={mood.icon} color={mood.color} size={40} /> : <IconTile icon="emoticon-neutral-outline" color={colors.textTertiary} size={40} />}
        <View style={styles.texts}>
          {/* Two lines allowed: on narrow phones the mood wraps whole under the prefix instead of "Average mood: O…". */}
          <Text variant="bodyStrong" numberOfLines={2}>
            Average mood:{' '}
            <Text variant="bodyStrong" color={mood?.color ?? colors.textSecondary}>
              {mood?.label ?? '—'}
            </Text>
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {avg ? `${avg.score.toFixed(1)} of 5 · all time` : 'No entries yet'}
          </Text>
        </View>
        <View style={styles.count} accessibilityLabel={`${entries.length} entries`}>
          <Text variant="heading" tabular>
            {entries.length}
          </Text>
          <Text variant="micro" tone="tertiary" style={styles.countLabel}>
            {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.stripHeader}>
        <Text variant="overline" tone="tertiary" style={styles.overline}>
          Last {MOOD_STRIP_DAYS} days
        </Text>
        <Text variant="caption" tone="tertiary">
          {logged} of {MOOD_STRIP_DAYS} days
        </Text>
      </View>
      <View
        style={styles.strip}
        onLayout={(e) => setStripWidth(Math.floor(e.nativeEvent.layout.width))}
        accessibilityRole="summary"
        accessibilityLabel={stripLabel(days)}
      >
        {days.map((d) => (
          <DaySlot key={d.dayStart} day={d} size={dot} />
        ))}
      </View>
    </Card>
  );
}

function DaySlot({ day, size }: { day: MoodDay; size: number }) {
  const def = day.mood ? moodFor(day.mood) : null;
  const frame = { width: size, height: size, borderRadius: size / 2 };
  const pip = Math.max(4, Math.round(size * 0.27));
  return (
    <View style={styles.slot}>
      {def ? (
        <View style={[styles.dot, frame, { backgroundColor: withAlpha(def.color, 0.2), borderColor: withAlpha(def.color, 0.55) }]}>
          <Icon name={def.icon} size={Math.round(size * 0.55)} color={def.color} />
        </View>
      ) : (
        <View style={[styles.dot, frame, day.isToday ? styles.todayEmpty : styles.dotEmptyFrame]}>
          <View style={[styles.emptyDot, { width: pip, height: pip, borderRadius: pip / 2 }]} />
        </View>
      )}
      <Text style={[styles.weekday, day.isToday && styles.weekdayToday]}>{formatWeekday(day.dayStart).charAt(0)}</Text>
    </View>
  );
}

function stripLabel(days: MoodDay[]): string {
  const logged = days.filter((d) => d.mood);
  if (!logged.length) return `No entries in the last ${days.length} days`;
  return `Last ${days.length} days: ${logged.map((d) => `${formatDateShort(d.dayStart)} ${moodFor(d.mood!).label}`).join(', ')}`;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  count: { alignItems: 'flex-end' },
  countLabel: { letterSpacing: 1.2, fontFamily: fonts.mono },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  stripHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  overline: { fontSize: 10, letterSpacing: 1.6 },
  strip: { flexDirection: 'row' },
  slot: { flex: 1, alignItems: 'center', gap: 5 },
  dot: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmptyFrame: { borderColor: 'transparent' },
  todayEmpty: { borderColor: colors.borderStrong, borderStyle: 'dashed' },
  emptyDot: { backgroundColor: colors.borderStrong },
  weekday: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, fontFamily: fonts.mono },
  weekdayToday: { color: colors.text },
});
