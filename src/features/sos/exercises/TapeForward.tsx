import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Icon, Text, TextField } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { colors, habitColors, spacing, withAlpha } from '@/theme';
import { TAPE_CARDS, type TapeTone } from '../content';
import { FadeIn } from '../components/FadeIn';
import { FillButton } from '../components/FillButton';
import { StepDots } from '../components/StepDots';
import type { ExerciseViewProps } from '../runner/types';

const TONE_LABEL: Record<TapeTone, string> = {
  giving_in: 'If you give in',
  riding_out: 'If you ride it out',
  reason: 'Your why',
};

function toneColor(tone: TapeTone, accent: string): string {
  if (tone === 'giving_in') return habitColors.slate;
  if (tone === 'riding_out') return colors.success;
  return accent;
}

/** Play the tape forward: guided cards — the relapse movie, then the recovery movie, then your reason. */
export function TapeForward({ exercise, habit, paused, onFinish }: ExerciseViewProps) {
  const haptic = useHaptics();
  const addJournalEntry = useStore((s) => s.addJournalEntry);
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState('');
  const [saveToJournal, setSaveToJournal] = useState(true);
  const card = TAPE_CARDS[index];
  const last = index === TAPE_CARDS.length - 1;
  const tone = toneColor(card.tone, exercise.color);
  const reason = habit?.reason.trim() ?? '';

  const go = (to: number) => {
    haptic('light');
    setIndex(to);
  };

  /** Text already written to the journal, so no exit path saves it twice. */
  const savedRef = useRef<string | null>(null);
  const saveOutcome = () => {
    const text = outcome.trim();
    if (!text || !saveToJournal || savedRef.current === text) return;
    savedRef.current = text;
    addJournalEntry({ title: 'Played the tape forward', body: text, mood: 'sunny', habitId: habit?.id ?? null });
  };

  const finish = () => {
    saveOutcome();
    onFinish();
  };

  // Leaving another way (Finish early, ×, hardware/browser back) unmounts this view:
  // keep what the user wrote instead of dropping it.
  const saveOnLeave = useEffectEvent(() => saveOutcome());
  useEffect(() => () => saveOnLeave(), []);

  return (
    <View style={styles.wrap}>
      <StepDots
        count={TAPE_CARDS.length}
        current={index}
        color={exercise.color}
        colorsPerStep={TAPE_CARDS.map((c) => toneColor(c.tone, exercise.color))}
      />

      <FadeIn id={index}>
        <Card tint={card.tone === 'giving_in' ? undefined : tone} tintStrength={0.08} style={styles.card} testID={`sos-tape-card-${index}`}>
          <View style={styles.top}>
            <Chip label={TONE_LABEL[card.tone].toUpperCase()} color={tone} />
            <Text variant="caption" tone="tertiary" mono>
              {index + 1}/{TAPE_CARDS.length}
            </Text>
          </View>
          <View style={[styles.iconWrap, { backgroundColor: withAlpha(tone, 0.14), borderColor: withAlpha(tone, 0.3) }]}>
            <Icon name={card.icon} size={30} color={tone} />
          </View>
          <Text variant="title" testID="sos-tape-title">
            {card.title}
          </Text>
          <Text variant="body" tone="secondary" style={styles.body}>
            {card.body}
          </Text>

          {card.tone === 'reason' ? (
            <View style={styles.reasonBlock}>
              {reason ? (
                <View style={[styles.quote, { borderLeftColor: tone }]}>
                  <Text variant="body" style={styles.quoteText}>
                    “{reason}”
                  </Text>
                </View>
              ) : habit ? (
                <Text variant="caption" tone="tertiary">
                  Tip: add your reason for quitting {habit.name} in the habit settings — it will show up here next time.
                </Text>
              ) : null}
              <TextField
                value={outcome}
                onChangeText={setOutcome}
                placeholder="Tomorrow I want to feel…"
                multiline
                maxLength={500}
                editable={!paused}
                accessibilityLabel="How you want tomorrow to feel"
                style={styles.input}
                testID="sos-tape-input"
              />
              {outcome.trim() ? (
                <Pressable
                  onPress={() => setSaveToJournal((v) => !v)}
                  accessibilityRole="checkbox"
                  aria-checked={saveToJournal}
                  accessibilityLabel="Save to my journal"
                  style={styles.saveRow}
                  hitSlop={6}
                >
                  <Icon name={saveToJournal ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={saveToJournal ? tone : colors.textTertiary} />
                  <Text variant="caption" tone="secondary">
                    Save to my journal
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Card>
      </FadeIn>

      <View style={styles.nav}>
        <Button label="Back" variant="secondary" icon="arrow-left" fullWidth={false} disabled={index === 0 || paused} onPress={() => go(index - 1)} style={styles.navBtn} />
        <FillButton
          label={last ? 'Finish' : 'Next'}
          fill={exercise.color}
          iconRight={last ? 'check' : 'arrow-right'}
          fullWidth={false}
          disabled={paused}
          onPress={last ? finish : () => go(index + 1)}
          style={styles.navBtn}
          testID="sos-tape-next"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  card: { gap: spacing.md, padding: spacing.xl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  body: { lineHeight: 22 },
  reasonBlock: { gap: spacing.md, marginTop: spacing.xs },
  quote: { borderLeftWidth: 2, paddingLeft: spacing.md },
  quoteText: { fontStyle: 'italic' },
  // Web draws a focus ring around the inner input; the field already has its own border.
  input: { minHeight: 88, outlineWidth: 0 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  nav: { flexDirection: 'row', gap: spacing.md },
  navBtn: { flex: 1 },
});
