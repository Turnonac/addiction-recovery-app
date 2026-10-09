import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { Button, DateTimeField, Header, Screen, SectionHeader, Text, TextField } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { JournalEntry } from '@/types';
import { HabitLinkPicker } from './components/HabitLinkPicker';
import { MissingEntry } from './components/MissingEntry';
import { MoodPicker } from './components/MoodPicker';
import { PromptChips } from './components/PromptChips';
import {
  TITLE_MAX,
  blankDraft,
  canSave,
  draftFromEntry,
  draftToInput,
  entryHref,
  firstParam,
  habitOptions,
  insertPrompt,
  isDraftDirty,
  titleCounter,
  validateDraft,
  type EntryDraft,
} from './logic';
import { useDiscardGuard } from './useDiscardGuard';
import { backOr, setEntryCreatedAt } from './useJournalActions';
import { useMountGuard } from './useRefocusGuard';

/** /journal/new — new entry, or edit with ?id=, or preselect a habit with ?habitId=. */
export function EntryEditorScreen() {
  const params = useLocalSearchParams<{ id?: string; habitId?: string }>();
  const id = firstParam(params.id);
  const habitParam = firstParam(params.habitId);
  const entry = useStore((s) => (id ? s.journal.find((j) => j.id === id) : undefined));
  const preselect = useStore((s) => (habitParam && s.habits.some((h) => h.id === habitParam) ? habitParam : null));

  if (id && !entry) return <MissingEntry left="close" />;
  return <EntryEditor key={id ?? 'new'} entry={entry} initialHabitId={preselect} />;
}

const BODY_MIN_HEIGHT = 160;

type Exit = { kind: 'back' } | { kind: 'replace'; href: string };

function EntryEditor({ entry, initialHabitId }: { entry?: JournalEntry; initialHabitId: string | null }) {
  const addJournalEntry = useStore((s) => s.addJournalEntry);
  const updateJournalEntry = useStore((s) => s.updateJournalEntry);
  const habits = useStore((s) => s.habits);
  const haptic = useHaptics();
  const now = useNow(30_000);
  const bodyRef = useRef<TextInput>(null);
  // Set by the first successful save; extra taps while the modal closes are ignored.
  const submitted = useRef(false);
  // False for a moment after opening: the second press of a double-tap on whatever opened the
  // editor ("+", the pencil) would otherwise land on the control now under it (a date chip, Save).
  const armed = useMountGuard();

  const isEdit = !!entry;
  const [initial] = useState<EntryDraft>(() => (entry ? draftFromEntry(entry) : blankDraft(Date.now(), initialHabitId)));
  const [draft, setDraft] = useState<EntryDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [exit, setExit] = useState<Exit | null>(null);
  // Web textareas don't grow with their content; native multiline inputs do (scrollEnabled=false).
  const [bodyHeight, setBodyHeight] = useState(BODY_MIN_HEIGHT);
  const dirty = isDraftDirty(initial, draft);
  const mood = moodFor(draft.mood);
  const options = habitOptions(habits, draft.habitId);

  const update = (patch: Partial<EntryDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (error && ('title' in patch || 'body' in patch)) setError(null);
  };

  // Close button, swipe-down, Android back, browser back and (web) reload all ask first.
  const fallbackHref = entry ? entryHref(entry.id) : '/journal';
  const guard = useDiscardGuard({ active: dirty && exit == null, isEdit, fallbackHref });

  // Navigate only after the re-render that lifts the unsaved-changes guard.
  useEffect(() => {
    if (!exit) return;
    if (exit.kind === 'back') router.back();
    else router.replace(exit.href);
  }, [exit]);

  const leave = () => {
    void guard.release().then(() => setExit(router.canGoBack() ? { kind: 'back' } : { kind: 'replace', href: fallbackHref }));
  };

  // Deep-linked (nothing to go back to): close to the same place Save would, not Home.
  // A replace removes this screen too, so the unsaved-changes prompt still runs first.
  const close = () => backOr(fallbackHref);

  const save = () => {
    if (!armed || submitted.current || exit) return;
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      haptic('error');
      return;
    }
    submitted.current = true;
    const input = draftToInput(draft);
    if (entry) {
      if (dirty) {
        updateJournalEntry(entry.id, input);
        if (draft.createdAt !== entry.createdAt) setEntryCreatedAt(entry.id, draft.createdAt);
      }
      haptic('success');
      leave();
      return;
    }
    // A date the user never touched means "now" at save time, not when the editor opened.
    addJournalEntry({ ...input, createdAt: draft.createdAt !== initial.createdAt ? draft.createdAt : undefined });
    haptic('success');
    leave();
  };

  const addPrompt = (prompt: string) => {
    haptic('light');
    update({ body: insertPrompt(draft.body, prompt) });
    setTimeout(() => bodyRef.current?.focus(), 50);
  };

  const saving = exit != null;
  const saveable = canSave(draft) && !saving;

  return (
    <View style={styles.root}>
      <Screen
        glowColor={mood.color}
        glowIntensity={0.28}
        keyboard
        safeTop={Platform.OS !== 'ios'}
        header={
          <Header
            title={isEdit ? 'Edit entry' : 'New entry'}
            left="close"
            onLeftPress={close}
            right={
              <Pressable
                onPress={save}
                disabled={saving}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Save entry"
                accessibilityState={{ disabled: saving }}
                testID="journal-save-header"
                style={({ pressed }) => [styles.headerSave, pressed && styles.pressed]}
              >
                <Text variant="bodyStrong" color={saveable ? colors.accent : colors.textTertiary}>
                  Save
                </Text>
              </Pressable>
            }
          />
        }
        testID="journal-editor"
      >
        <Text variant="heading" style={styles.question}>
          How are you feeling?
        </Text>
        <MoodPicker value={draft.mood} onChange={(m) => update({ mood: m })} />

        <SectionHeader title="Entry" icon="pencil-outline" />
        <View style={styles.fields}>
          <TextField
            value={draft.title}
            onChangeText={(title) => update({ title })}
            placeholder="Give it a title"
            maxLength={TITLE_MAX}
            suffix={titleCounter(draft.title)}
            returnKeyType="next"
            onSubmitEditing={() => bodyRef.current?.focus()}
            submitBehavior="submit"
            accessibilityLabel="Title"
            testID="journal-title"
            style={styles.titleInput}
          />
          <TextField
            ref={bodyRef}
            value={draft.body}
            onChangeText={(body) => update({ body })}
            placeholder="Write freely — this stays on your device."
            multiline
            scrollEnabled={false}
            accessibilityLabel="Entry text"
            testID="journal-body"
            error={error ?? undefined}
            hint={!draft.title.trim() && draft.body.trim() ? 'No title? The first line will be used.' : undefined}
            onContentSizeChange={Platform.OS === 'web' ? (e) => setBodyHeight(Math.max(BODY_MIN_HEIGHT, Math.ceil(e.nativeEvent.contentSize.height))) : undefined}
            style={[styles.bodyInput, Platform.OS === 'web' && { height: bodyHeight }]}
          />
        </View>

        <SectionHeader title="Need inspiration?" icon="lightbulb-on-outline" />
        <PromptChips onPick={addPrompt} />

        {options.length ? (
          <>
            <SectionHeader title="Link to habit" icon="link-variant" />
            <HabitLinkPicker habits={options} value={draft.habitId} onChange={(habitId) => update({ habitId })} />
          </>
        ) : null}

        <SectionHeader title="Date & time" icon="calendar-clock" />
        <DateTimeField
          value={draft.createdAt}
          onChange={(createdAt) => update({ createdAt })}
          maximumDate={Math.max(now, draft.createdAt)}
          testID="journal-date"
        />

        <Button label={isEdit ? 'Save changes' : 'Save entry'} icon="check" size="lg" onPress={save} disabled={saving} style={styles.saveButton} testID="journal-save" />
      </Screen>
      {/* Press shield (see `armed`): covers the header too, so a stray press can't reach Close or Save. */}
      {armed ? null : <View style={StyleSheet.absoluteFill} testID="journal-editor-shield" />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerSave: { paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  pressed: { opacity: 0.6 },
  question: { marginTop: spacing.sm, marginBottom: spacing.md },
  fields: { gap: spacing.md },
  // outlineWidth: no browser focus rectangle inside the rounded fields on web.
  // minWidth 0: a web <input> keeps its intrinsic width and would push the n/80 counter out.
  titleInput: { fontSize: 17, fontWeight: '600', outlineWidth: 0, minWidth: 0 },
  bodyInput: { minHeight: BODY_MIN_HEIGHT, fontSize: 16, lineHeight: 23, outlineWidth: 0 },
  saveButton: { marginTop: spacing.xxl },
});
