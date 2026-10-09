import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button, Card, Icon, IconTile, Text } from '@/components';
import { colors, spacing, withAlpha } from '@/theme';
import type { RelapseOutcome, SupportQuote } from '../relapseLogic';
import { doneTitle, recordLine, savedLine } from '../relapseLogic';

export interface RelapseDoneProps {
  color: string;
  outcome: RelapseOutcome;
  /** When the relapse was logged (for "starts now" vs "has begun"). */
  loggedAt: number;
  quote: SupportQuote;
  onJournal: () => void;
  onBack: () => void;
  /** Omitted when undoing would not remove this relapse (the undo button is hidden). */
  onUndo?: () => void;
}

/** Step 2 after logging: the new attempt, the record that stays, a supportive quote and next steps. */
export function RelapseDone({ color, outcome, loggedAt, quote, onJournal, onBack, onUndo }: RelapseDoneProps) {
  return (
    <View style={styles.wrap} testID="relapse-done">
      <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
        <View style={[styles.halo, { borderColor: withAlpha(color, 0.3), backgroundColor: withAlpha(color, 0.08), boxShadow: `0 0 48px ${withAlpha(color, 0.45)}` }]}>
          <View style={[styles.core, { backgroundColor: withAlpha(color, 0.2), borderColor: withAlpha(color, 0.6) }]}>
            <Icon name="sprout" size={44} color={color} />
          </View>
        </View>
        <Text variant="overline" color={color} style={styles.kicker}>
          A FRESH START
        </Text>
        <Text variant="title" center accessibilityRole="header">
          {doneTitle(outcome, loggedAt)}
        </Text>
        <Text variant="body" tone="secondary" center style={styles.sub}>
          Be kind to yourself. One slip doesn’t erase the progress you made.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.cards}>
        <Card testID="relapse-record">
          <View style={styles.row}>
            <IconTile icon="trophy" color={colors.gold} size={44} shape="circle" />
            <View style={styles.flex}>
              <Text variant="subheading">{recordLine(outcome)}</Text>
              <Text variant="caption" tone="secondary">
                {savedLine(outcome)}
              </Text>
            </View>
          </View>
        </Card>

        <Card tint={color} tintStrength={0.06}>
          <Icon name="format-quote-open" size={26} color={color} />
          <Text variant="body" style={styles.quote}>
            {quote.text}
          </Text>
          {quote.author ? (
            <Text variant="caption" tone="tertiary" style={styles.author}>
              {`— ${quote.author}`}
            </Text>
          ) : null}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.actions}>
        <Button label="Write in journal" icon="notebook-edit-outline" onPress={onJournal} testID="relapse-journal" />
        <Button label="Back to habit" variant="secondary" onPress={onBack} testID="relapse-back" />
        {onUndo ? <Button label="Logged by mistake? Undo" variant="ghost" size="sm" onPress={onUndo} testID="relapse-undo" /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.lg },
  hero: { alignItems: 'center' },
  halo: { width: 132, height: 132, borderRadius: 66, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  core: { width: 92, height: 92, borderRadius: 46, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { marginTop: spacing.xl, marginBottom: spacing.sm },
  sub: { marginTop: spacing.sm, maxWidth: 320 },
  cards: { marginTop: spacing.xxl, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  quote: { fontSize: 17, lineHeight: 25, fontStyle: 'italic', marginTop: spacing.sm },
  author: { marginTop: spacing.sm },
  actions: { marginTop: spacing.xxl, gap: spacing.sm },
});
