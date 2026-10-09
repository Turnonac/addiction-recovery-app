import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, DateTimeField, Header, Screen, Text, TextField } from '@/components';
import { HabitNotFound } from '@/features/habit-detail/components/HabitNotFound';
import { closeOr } from '@/features/habit-detail/navigation';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { useHabit } from '@/store/selectors';
import { colors, spacing } from '@/theme';
import type { MoodId, TriggerId } from '@/types';
import { notify } from '@/utils/confirm';
import { MoodPicker } from './components/MoodPicker';
import { RelapseDone } from './components/RelapseDone';
import { RelapseIntro } from './components/RelapseIntro';
import { TriggerPicker } from './components/TriggerPicker';
import {
  isNowPick,
  pickQuote,
  previewLines,
  relapseMinAt,
  relapseOutcome,
  resolveRelapseAt,
  undoTargetId,
  type RelapseOutcome,
} from './relapseLogic';

export interface RelapseScreenProps {
  habitId: string | undefined;
}

interface Logged {
  id: string;
  outcome: RelapseOutcome;
  loggedAt: number;
  quoteSeed: number;
}

/** "Log a relapse" modal: when, triggers, mood and a note, then an encouraging fresh-start step. */
export function RelapseScreen({ habitId }: RelapseScreenProps) {
  const habit = useHabit(habitId);
  const relapses = useStore((s) => s.relapses);
  const logRelapse = useStore((s) => s.logRelapse);
  const undoLastRelapse = useStore((s) => s.undoLastRelapse);
  const haptic = useHaptics();
  const insets = useSafeAreaInsets();
  const now = useNow(30_000);

  const [at, setAt] = useState(() => Date.now());
  // Until the user picks an earlier time, "now" means the moment they press the button.
  const [atTouched, setAtTouched] = useState(false);
  const [triggers, setTriggers] = useState<TriggerId[]>([]);
  const [mood, setMood] = useState<MoodId | null>(null);
  const [note, setNote] = useState('');
  const [logged, setLogged] = useState<Logged | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const undoingRef = useRef(false);

  const safeTop = Platform.OS !== 'ios';

  if (!habit) {
    return (
      <Screen safeTop={safeTop} header={<Header title="Log a relapse" left="close" />}>
        <HabitNotFound />
      </Screen>
    );
  }

  // Leaving always lands on the habit, also when this modal was opened by a deep link.
  const leave = () => closeOr(`/habit/${habit.id}`);

  if (logged) {
    // Only offer undo while the store's "last relapse" really is the one just logged.
    const canUndo = undoTargetId(relapses, habit.id) === logged.id;
    const undo = () => {
      // One shot: a double tap must not also remove the relapse before this one.
      if (undoingRef.current || undoTargetId(useStore.getState().relapses, habit.id) !== logged.id) return;
      undoingRef.current = true;
      undoLastRelapse(habit.id);
      haptic('light');
      leave();
    };
    return (
      <Screen safeTop={safeTop} glowColor={habit.color} glowIntensity={0.45} header={<Header left="close" title="" onLeftPress={leave} />}>
        <RelapseDone
          color={habit.color}
          outcome={logged.outcome}
          loggedAt={logged.loggedAt}
          quote={pickQuote(logged.quoteSeed)}
          onJournal={() => router.replace(`/journal/new?habitId=${encodeURIComponent(habit.id)}`)}
          onBack={leave}
          onUndo={canUndo ? undo : undefined}
        />
      </Screen>
    );
  }

  const minAt = relapseMinAt(habit.startedAt, now);
  const effectiveAt = atTouched ? Math.max(at, minAt) : now;
  const outcome = relapseOutcome(habit, relapses, effectiveAt, now);
  const lines = previewLines(outcome, now);

  const submit = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const t = Date.now();
    const when = resolveRelapseAt(atTouched ? at : null, habit.startedAt, t);
    const result = relapseOutcome(habit, relapses, when, t);
    const id = logRelapse(habit.id, { at: when, triggers, mood, note });
    if (!id) {
      submittingRef.current = false;
      setSubmitting(false);
      notify('Could not log relapse', 'Please try again.');
      return;
    }
    haptic('warning');
    setLogged({ id, outcome: result, loggedAt: t, quoteSeed: t });
  };

  const footer = (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <Button
        label="Log relapse & restart"
        icon="restore"
        variant="accent"
        color={colors.danger}
        size="lg"
        onPress={submit}
        loading={submitting}
        testID="relapse-submit"
      />
      <Text variant="caption" tone="tertiary" center>
        You can undo this later from Streak history.
      </Text>
    </View>
  );

  return (
    <Screen
      safeTop={safeTop}
      keyboard
      glowColor={habit.color}
      glowIntensity={0.3}
      header={<Header title="Log a relapse" subtitle={habit.name} left="close" onLeftPress={leave} />}
      footer={footer}
      testID="relapse-form"
    >
      <RelapseIntro color={habit.color} lines={lines} />

      <Field title="When did it happen?">
        <DateTimeField
          value={effectiveAt}
          onChange={(v) => {
            setAt(v);
            // "Now" (or a time within a couple of minutes of it) is logged at submit time.
            setAtTouched(!isNowPick(v, Date.now()));
          }}
          minimumDate={minAt}
          maximumDate={now}
          testID="relapse-when"
        />
      </Field>

      <Field title="What triggered it?" hint="Select all that apply">
        <TriggerPicker value={triggers} onChange={setTriggers} />
      </Field>

      <Field title="How do you feel?">
        <MoodPicker value={mood} onChange={setMood} />
      </Field>

      <Field title="Note">
        <TextField
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
          placeholder="What happened? What could you do differently next time?"
          accessibilityLabel="Note"
          testID="relapse-note"
        />
      </Field>
    </Screen>
  );
}

function Field({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text variant="subheading">{title}</Text>
        {hint ? (
          <Text variant="caption" tone="tertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: spacing.xxl, gap: spacing.md },
  fieldHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
