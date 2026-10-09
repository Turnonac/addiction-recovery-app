import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Header, IconButton, Screen, Text } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { Habit, JournalEntry } from '@/types';
import { DayHeader } from './components/DayHeader';
import { EntryCard } from './components/EntryCard';
import { HabitFilterRow, MoodFilterRow } from './components/FilterBar';
import { JournalEmpty } from './components/JournalEmpty';
import { JournalFab, useFabClearance } from './components/JournalFab';
import { MoodOverviewCard } from './components/MoodOverviewCard';
import { SearchField } from './components/SearchField';
import { EMPTY_FILTER, editorHref, entryCountLabel, entryHref, filterEntries, groupByDay, isFilterActive, linkedHabits, type DayGroup, type JournalFilter } from './logic';
import { useDeleteEntry } from './useJournalActions';
import { useRefocusGuard } from './useRefocusGuard';

/** Scroll offset after which the large title is gone and the compact header title shows. */
const COMPACT_AFTER = 48;
const ENTRY_GAP = spacing.sm + 2;

/** Journal list: mood overview, filters, search, entries grouped by day, purple "+" FAB. */
export function JournalListScreen() {
  const journal = useStore((s) => s.journal);
  const habits = useStore((s) => s.habits);
  const now = useNow(60_000);
  const haptic = useHaptics();
  const deleteEntry = useDeleteEntry();
  const fabClearance = useFabClearance();
  const ready = useRefocusGuard();
  const [filter, setFilter] = useState<JournalFilter>(EMPTY_FILTER);
  const [compact, setCompact] = useState(false);

  // An emptied journal starts over unfiltered, so a stale filter can't hide the next first entry.
  if (!journal.length && filter !== EMPTY_FILTER) setFilter(EMPTY_FILTER);

  const habitById = new Map(habits.map((h) => [h.id, h]));
  const habitChips = linkedHabits(habits, journal);
  // A habit filter whose habit lost all its entries would hide everything; ignore it.
  const activeFilter: JournalFilter = filter.habitId && !habitChips.some((h) => h.id === filter.habitId) ? { ...filter, habitId: null } : filter;
  const filtering = isFilterActive(activeFilter);
  const filtered = filterEntries(journal, activeFilter);
  const visible = groupByDay(filtered);

  const newEntry = () => {
    if (!ready()) return;
    haptic('light');
    router.push(editorHref());
  };
  const open = (entry: JournalEntry) => {
    if (ready()) router.push(entryHref(entry.id));
  };
  const askDelete = (entry: JournalEntry) => {
    if (ready()) void deleteEntry(entry);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > COMPACT_AFTER;
    if (next !== compact) setCompact(next);
  };

  const header = (
    <Header
      title={compact && journal.length ? 'Journal' : undefined}
      left="back"
      right={<IconButton icon="chart-line" onPress={() => router.push('/stats?tab=mood')} accessibilityLabel="Mood statistics" testID="journal-mood-stats" />}
    />
  );

  if (!journal.length) {
    return (
      <Screen glowColor={colors.purple} glowIntensity={0.3} header={header} footer={<JournalFab onPress={newEntry} />} testID="journal-screen">
        <TitleBlock />
        <JournalEmpty
          icon="notebook-heart-outline"
          title="Your private space"
          message="Write down cravings, small wins and how you feel. Over time you’ll see what really drives your urges. Entries never leave this device."
          actionLabel="Write first entry"
          actionIcon="pencil-outline"
          onAction={newEntry}
          testID="journal-empty"
        />
      </Screen>
    );
  }

  const listHeader = (
    <View style={styles.headerStack}>
      <TitleBlock />
      <MoodOverviewCard entries={journal} now={now} />
      <SearchField value={filter.query} onChange={(query) => setFilter((f) => ({ ...f, query }))} />
      <MoodFilterRow value={activeFilter.mood} onChange={(mood) => setFilter((f) => ({ ...f, mood }))} />
      <HabitFilterRow habits={habitChips} value={activeFilter.habitId} onChange={(habitId) => setFilter((f) => ({ ...f, habitId }))} />
      {filtering ? (
        <ResultsRow shown={filtered.length} total={journal.length} onClear={() => setFilter(EMPTY_FILTER)} />
      ) : null}
    </View>
  );

  return (
    <Screen
      glowColor={colors.purple}
      glowIntensity={0.3}
      scroll={false}
      header={header}
      footer={<JournalFab onPress={newEntry} />}
      contentStyle={styles.screenContent}
      testID="journal-screen"
    >
      <SectionList<JournalEntry, DayGroup>
        sections={visible}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={listHeader}
        renderSectionHeader={({ section }) => <DayHeader label={section.label} count={section.data.length} />}
        renderItem={({ item }) => (
          <EntryCard entry={item} habit={item.habitId ? habitById.get(item.habitId) : undefined} onPress={open} onLongPress={askDelete} />
        )}
        ItemSeparatorComponent={EntrySeparator}
        ListEmptyComponent={
          <JournalEmpty
            icon="text-search"
            title="No entries match"
            message={noMatchMessage(activeFilter, habitById)}
            actionLabel="Clear filters"
            actionIcon="filter-remove-outline"
            onAction={() => setFilter(EMPTY_FILTER)}
            testID="journal-no-match"
          />
        }
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={[styles.listContent, { paddingBottom: fabClearance }]}
        testID="journal-list"
      />
    </Screen>
  );
}

function TitleBlock() {
  return (
    <View style={styles.titleBlock}>
      <Text variant="title" accessibilityRole="header">
        Journal
      </Text>
      <Text variant="body" tone="secondary">
        Private journaling with mood tracking
      </Text>
    </View>
  );
}

function EntrySeparator() {
  return <View style={{ height: ENTRY_GAP }} />;
}

function ResultsRow({ shown, total, onClear }: { shown: number; total: number; onClear: () => void }) {
  return (
    <View style={styles.results}>
      <Text variant="caption" tone="tertiary">
        Showing {shown} of {entryCountLabel(total)}
      </Text>
      <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear filters" style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text variant="captionStrong" color={colors.accent}>
          Clear
        </Text>
      </Pressable>
    </View>
  );
}

function noMatchMessage(filter: JournalFilter, habitById: Map<string, Habit>): string {
  const query = filter.query.trim();
  if (query) return `Nothing in your journal mentions “${query}”${filter.mood || filter.habitId ? ' with these filters' : ''}.`;
  const habit = filter.habitId ? habitById.get(filter.habitId) : undefined;
  if (habit) return `No entries about ${habit.name}${filter.mood ? ' with this mood' : ''} yet.`;
  return 'No entries with this mood yet. Try another filter.';
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0, paddingBottom: 0 },
  listContent: { paddingHorizontal: spacing.lg },
  headerStack: { gap: spacing.md },
  titleBlock: { gap: 4, paddingTop: spacing.xs, paddingBottom: spacing.xs },
  results: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
});
