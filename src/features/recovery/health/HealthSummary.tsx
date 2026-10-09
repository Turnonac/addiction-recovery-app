import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import type { HealthProgress } from '@/domain/catalog/health';
import { spacing } from '@/theme';
import { formatDurationShort, pluralDays } from '@/utils/format';
import { GradientRing } from '../shared/GradientRing';

export interface HealthSummaryProps {
  progress: HealthProgress;
  color: string;
  streakDays: number;
  /** When set, the card scrolls the timeline to the next milestone. */
  onPressNext?: () => void;
}

/** Top card on the health screen: achieved/total ring + what comes next. */
export function HealthSummary({ progress, color, streakDays, onPressNext }: HealthSummaryProps) {
  const { achieved, total, current } = progress;
  const ratio = total > 0 ? achieved / total : 0;
  // On 320pt phones a 92px ring leaves ~140px for the headline; shrink it to keep the text whole.
  const compact = useWindowDimensions().width < 360;

  const headline =
    achieved === total ? `All ${total} milestones reached` : achieved === 0 ? 'Your recovery starts now' : `${achieved} of ${total} milestones reached`;

  return (
    <Card
      tint={color}
      tintStrength={0.08}
      onPress={onPressNext}
      accessibilityLabel={
        current
          ? `${headline}. Next: ${current.milestone.title} in ${formatDurationShort(current.msRemaining)}.${onPressNext ? ' Jump to next milestone' : ''}`
          : `${headline}.`
      }
    >
      <View style={styles.row}>
        <GradientRing progress={ratio} size={compact ? 76 : 92} strokeWidth={compact ? 7 : 8} color={color}>
          <Text style={[styles.ringValue, compact && styles.ringValueCompact]} tabular>
            {achieved}
            <Text style={[styles.ringTotal, compact && styles.ringTotalCompact]} tone="tertiary">{`/${total}`}</Text>
          </Text>
          <Text variant="micro" tone="tertiary" style={[styles.ringLabel, compact && styles.ringLabelCompact]}>
            REACHED
          </Text>
        </GradientRing>
        <View style={styles.text}>
          <Text variant="subheading" numberOfLines={3}>
            {headline}
          </Text>
          {current ? (
            <>
              <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.next}>
                {`Next: ${current.milestone.title}`}
              </Text>
              <View style={styles.etaRow}>
                <Text variant="captionStrong" color={color} tabular>
                  {`in ${formatDurationShort(current.msRemaining)}`}
                </Text>
                {onPressNext ? <Icon name="arrow-down" size={14} color={color} /> : null}
              </View>
            </>
          ) : (
            <Text variant="caption" tone="secondary" style={styles.next}>
              {`${pluralDays(streakDays)} clean. Every milestone on this timeline is behind you.`}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ringValue: { fontSize: 24, fontWeight: '800' },
  ringValueCompact: { fontSize: 20 },
  ringTotal: { fontSize: 14, fontWeight: '700' },
  ringTotalCompact: { fontSize: 12 },
  ringLabel: { letterSpacing: 1.2, marginTop: 1, fontSize: 10 },
  ringLabelCompact: { letterSpacing: 0.8, fontSize: 9 },
  text: { flex: 1, gap: 2 },
  next: { marginTop: 4, lineHeight: 18 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
