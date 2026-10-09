import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components';
import type { HealthMilestone } from '@/domain/catalog/health';
import { colors, spacing, withAlpha } from '@/theme';
import { formatDate, formatDateShort, formatDurationShort, formatPercent } from '@/utils/format';
import { milestoneTimeLabel, needsYear, type TimelineState } from '../logic';
import { NODE_SIZE, TimelineNode } from './TimelineNode';

const LINE_WIDTH = 2;
/** Top offset of the node inside a row, so it lines up with the title. */
const NODE_TOP = 4;
const NODE_TOP_CARD = spacing.md + 2;

export interface TimelineRowProps {
  milestone: HealthMilestone;
  state: TimelineState;
  color: string;
  isFirst: boolean;
  isLast: boolean;
  /** Epoch ms when the milestone is (or was) reached. */
  reachedAt: number;
  now: number;
  /** 0..1 progress toward this milestone (current row). */
  fraction: number;
  msRemaining: number;
}

/** One milestone on the vertical health timeline (rail + node + content). */
export function TimelineRow({ milestone, state, color, isFirst, isLast, reachedAt, now, fraction, msRemaining }: TimelineRowProps) {
  const current = state === 'current';
  const nodeTop = current ? NODE_TOP_CARD : NODE_TOP;
  const lineOn = withAlpha(color, 0.85);
  const lineOff = colors.borderStrong;
  // A segment is "lit" when the node above it has been reached.
  const topColor = state === 'upcoming' ? lineOff : lineOn;
  const bottomColor = state === 'achieved' ? lineOn : lineOff;
  const timeLabel = milestoneTimeLabel(milestone.afterMs);

  const a11y =
    state === 'achieved'
      ? `${milestone.title}, reached ${formatDate(reachedAt)}. ${milestone.description}`
      : current
        ? `${milestone.title}, next milestone in ${formatDurationShort(msRemaining)}, ${formatPercent(fraction)}. ${milestone.description}`
        : `${milestone.title}, after ${timeLabel.toLowerCase()}. ${milestone.description}`;

  return (
    <View style={styles.row} accessible accessibilityLabel={a11y}>
      <View style={styles.rail}>
        {!isFirst && <View style={[styles.line, { top: 0, height: nodeTop + NODE_SIZE / 2, backgroundColor: topColor }]} />}
        {!isLast && <View style={[styles.line, { top: nodeTop + NODE_SIZE / 2, bottom: 0, backgroundColor: bottomColor }]} />}
        <View style={{ marginTop: nodeTop }}>
          <TimelineNode state={state} color={color} icon={milestone.icon} progress={fraction} />
        </View>
      </View>

      <View style={[styles.body, isLast && styles.bodyLast]}>
        {current ? (
          <Card tint={color} tintStrength={0.1} padding={spacing.md}>
            <View style={styles.labelRow}>
              <Text variant="overline" color={color}>
                {timeLabel}
              </Text>
              <Text variant="micro" color={color} style={styles.nextTag}>
                NEXT UP
              </Text>
            </View>
            <Text variant="subheading" style={styles.title}>
              {milestone.title}
            </Text>
            <Text variant="caption" tone="secondary" style={styles.description}>
              {milestone.description}
            </Text>
            <View style={styles.countdownRow}>
              <Text variant="caption" tone="secondary">
                {'in '}
                <Text variant="bodyStrong" color={color} tabular>
                  {formatDurationShort(msRemaining)}
                </Text>
              </Text>
              <Text variant="captionStrong" color={color} tabular>
                {formatPercent(fraction)}
              </Text>
            </View>
            <ProgressBar progress={fraction} color={color} height={6} style={styles.bar} />
          </Card>
        ) : (
          <View style={styles.plain}>
            <View style={styles.labelRow}>
              <Text variant="overline" color={state === 'achieved' ? withAlpha(color, 0.9) : colors.textTertiary}>
                {timeLabel}
              </Text>
              {state === 'achieved' ? (
                <Text variant="caption" tone="tertiary" numberOfLines={1}>
                  {`Reached ${needsYear(reachedAt, now) ? formatDate(reachedAt) : formatDateShort(reachedAt)}`}
                </Text>
              ) : null}
            </View>
            <Text variant="bodyStrong" tone={state === 'upcoming' ? 'secondary' : 'primary'} style={styles.title}>
              {milestone.title}
            </Text>
            <Text variant="caption" tone={state === 'upcoming' ? 'tertiary' : 'secondary'} style={styles.description}>
              {milestone.description}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: NODE_SIZE, alignItems: 'center' },
  line: { position: 'absolute', left: NODE_SIZE / 2 - LINE_WIDTH / 2, width: LINE_WIDTH, borderRadius: 1 },
  body: { flex: 1, paddingBottom: spacing.xl },
  bodyLast: { paddingBottom: 0 },
  plain: { paddingTop: NODE_TOP },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  nextTag: { letterSpacing: 1.2 },
  title: { marginTop: 3 },
  description: { marginTop: 3, lineHeight: 18 },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.md },
  bar: { marginTop: spacing.sm },
});
