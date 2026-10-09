import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header, Icon, IconButton, Screen, Text } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import { useStore } from '@/store';
import { colors, fonts, spacing, withAlpha } from '@/theme';
import type { JournalEntry } from '@/types';
import { formatDateTime, formatWeekday, plural } from '@/utils/format';
import { AdjacentEntries } from './components/AdjacentEntries';
import { HabitLinkPill } from './components/HabitLinkPill';
import { MissingEntry } from './components/MissingEntry';
import { MoodBadge } from './components/MoodBadge';
import { editorHref, firstParam, wordCount } from './logic';
import { backOr, useDeleteEntry } from './useJournalActions';
import { useRefocusGuard } from './useRefocusGuard';

/** /journal/[id] — read one entry; edit or delete from the header. */
export function EntryViewScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = firstParam(params.id);
  const entry = useStore((s) => (id ? s.journal.find((j) => j.id === id) : undefined));
  // Keeps the page rendered while it animates away after a delete.
  const [deleted, setDeleted] = useState<JournalEntry | null>(null);
  const shown = entry ?? (deleted?.id === id ? deleted : undefined);
  const habit = useStore((s) => (shown?.habitId ? s.habits.find((h) => h.id === shown.habitId) : undefined));
  const deleteEntry = useDeleteEntry();
  const ready = useRefocusGuard();

  if (!shown) return <MissingEntry />;

  const mood = moodFor(shown.mood);
  const words = wordCount(shown.body);
  // A titled entry without notes shows nothing under the rule; neither title nor body → "mood check-in".
  const checkInOnly = !shown.body && !shown.title.trim();

  const onDelete = async () => {
    if (!ready()) return;
    const ok = await deleteEntry(shown, () => setDeleted(shown));
    if (ok) backOr('/journal');
  };

  return (
    // Keyed by entry: Older/Newer swap the id param in place, and a fresh scroll view starts at the top.
    <Screen
      key={shown.id}
      glowColor={mood.color}
      glowIntensity={0.4}
      header={
        <Header
          left="back"
          onLeftPress={() => backOr('/journal')}
          right={
            <>
              <IconButton icon="pencil-outline" onPress={() => ready() && router.push(editorHref({ id: shown.id }))} accessibilityLabel="Edit entry" testID="journal-edit" />
              <IconButton icon="trash-can-outline" color={colors.danger} onPress={() => void onDelete()} accessibilityLabel="Delete entry" testID="journal-delete" />
            </>
          }
        />
      }
      testID="journal-view"
    >
      <View style={styles.meta}>
        <MoodBadge mood={mood} />
        {habit ? <HabitLinkPill habit={habit} onPress={() => ready() && router.push(`/habit/${habit.id}`)} /> : null}
      </View>

      <Text variant="title" selectable style={styles.title} accessibilityRole="header">
        {shown.title || 'Untitled'}
      </Text>
      <Text style={styles.date} tabular>
        {formatWeekday(shown.createdAt)}, {formatDateTime(shown.createdAt)}
      </Text>

      <View style={[styles.rule, { backgroundColor: withAlpha(mood.color, 0.35) }]} />

      {shown.body ? (
        <Text selectable style={styles.body} testID="journal-view-body">
          {shown.body}
        </Text>
      ) : checkInOnly ? (
        <Text variant="body" tone="tertiary" style={styles.noBody}>
          No text — just a mood check-in.
        </Text>
      ) : null}

      <View style={[styles.footer, !shown.body && !checkInOnly && styles.footerTight]}>
        <Icon name="lock-outline" size={14} color={colors.textTertiary} />
        <Text variant="caption" tone="tertiary">
          Private · stored only on this device{words ? ` · ${plural(words, 'word')}` : ''}
        </Text>
      </View>

      <AdjacentEntries entryId={shown.id} ready={ready} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  title: { marginTop: spacing.lg },
  date: { marginTop: spacing.sm, fontFamily: fonts.mono, fontSize: 13, color: colors.textTertiary },
  rule: { height: 2, width: 40, borderRadius: 1, marginTop: spacing.xl, marginBottom: spacing.xl },
  body: { fontSize: 17, lineHeight: 27, color: withAlpha(colors.text, 0.88) },
  noBody: { fontStyle: 'italic' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xxxl },
  footerTight: { marginTop: 0 },
});
