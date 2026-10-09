import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, IconTile, Text } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import { useStore } from '@/store';
import { colors, radius, spacing } from '@/theme';
import type { JournalEntry } from '@/types';
import { formatDateShort } from '@/utils/format';
import { sortNewestFirst } from '../logic';

/** "Older / Newer" shortcuts at the bottom of an entry, to read the journal like a book. */
export function AdjacentEntries({ entryId, ready }: { entryId: string; ready?: () => boolean }) {
  const journal = useStore((s) => s.journal);
  const sorted = sortNewestFirst(journal);
  const index = sorted.findIndex((e) => e.id === entryId);
  if (index < 0) return null;
  const newer = index > 0 ? sorted[index - 1] : undefined;
  const older = index < sorted.length - 1 ? sorted[index + 1] : undefined;
  if (!newer && !older) return null;

  return (
    <View style={styles.row}>
      {older ? <Neighbor entry={older} direction="older" ready={ready} /> : <View style={styles.flex} />}
      {newer ? <Neighbor entry={newer} direction="newer" ready={ready} /> : <View style={styles.flex} />}
    </View>
  );
}

function Neighbor({ entry, direction, ready }: { entry: JournalEntry; direction: 'older' | 'newer'; ready?: () => boolean }) {
  const mood = moodFor(entry.mood);
  const older = direction === 'older';
  return (
    <Pressable
      onPress={() => {
        if (!ready || ready()) router.setParams({ id: entry.id });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${older ? 'Older' : 'Newer'} entry: ${entry.title || 'Untitled'}`}
      testID={`journal-${direction}`}
      style={({ pressed }) => [styles.card, styles.flex, pressed && styles.pressed]}
    >
      <View style={[styles.head, !older && styles.headRight]}>
        {older ? <Icon name="chevron-left" size={14} color={colors.textTertiary} /> : null}
        <Text variant="overline" tone="tertiary" style={styles.overline}>
          {older ? 'Older' : 'Newer'} · {formatDateShort(entry.createdAt)}
        </Text>
        {!older ? <Icon name="chevron-right" size={14} color={colors.textTertiary} /> : null}
      </View>
      <View style={[styles.body, !older && styles.bodyRight]}>
        <IconTile icon={mood.icon} color={mood.color} size={24} />
        <Text variant="captionStrong" numberOfLines={2} style={[styles.title, !older && styles.titleRight]}>
          {entry.title || 'Untitled'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  flex: { flex: 1 },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.cardPressed },
  head: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headRight: { justifyContent: 'flex-end' },
  overline: { fontSize: 10, letterSpacing: 1.2 },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bodyRight: { flexDirection: 'row-reverse' },
  title: { flex: 1 },
  titleRight: { textAlign: 'right' },
});
