import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, Icon, IconTile, Text } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Habit, JournalEntry } from '@/types';
import { formatTime } from '@/utils/format';
import { previewText } from '../logic';

export interface EntryCardProps {
  entry: JournalEntry;
  habit?: Habit;
  onPress: (entry: JournalEntry) => void;
  onLongPress?: (entry: JournalEntry) => void;
}

/** Journal list card: mood bar + tile, title, time, 2-line preview, optional habit chip. */
export function EntryCard({ entry, habit, onPress, onLongPress }: EntryCardProps) {
  const mood = moodFor(entry.mood);
  const preview = previewText(entry.body);
  const time = formatTime(entry.createdAt);

  return (
    <Pressable
      onPress={() => onPress(entry)}
      onLongPress={onLongPress ? () => onLongPress(entry) : undefined}
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title || 'Untitled'}, ${mood.label} mood, ${time}${habit ? `, ${habit.name}` : ''}`}
      accessibilityHint={onLongPress ? 'Opens the entry. Long press to delete.' : 'Opens the entry'}
      accessibilityActions={onLongPress ? [{ name: 'delete', label: 'Delete entry' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'delete') onLongPress?.(entry);
      }}
      testID={`journal-entry-${entry.id}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.bar, { backgroundColor: mood.color }]} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <IconTile icon={mood.icon} color={mood.color} size={28} style={styles.tile} />
          <Text variant="bodyStrong" style={styles.title} numberOfLines={1}>
            {entry.title || 'Untitled'}
          </Text>
          <Text style={styles.time} tabular>
            {time}
          </Text>
          <Icon name="chevron-right" size={16} color={colors.textTertiary} />
        </View>
        {preview ? (
          <Text variant="body" tone="secondary" numberOfLines={2} style={styles.preview}>
            {preview}
          </Text>
        ) : null}
        {habit ? <Chip label={habit.name} icon={habit.icon} color={habit.color} style={styles.chip} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: 14,
    paddingLeft: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.cardPressed, transform: [{ scale: 0.99 }] },
  bar: { width: 3, borderRadius: 2, alignSelf: 'stretch', marginVertical: 2 },
  content: { flex: 1, gap: 6, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tile: { borderRadius: 7 },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  time: { fontFamily: fonts.mono, fontSize: 12, color: colors.textTertiary, marginLeft: spacing.xs },
  preview: { fontSize: 14, lineHeight: 20 },
  chip: { marginTop: 2 },
});
