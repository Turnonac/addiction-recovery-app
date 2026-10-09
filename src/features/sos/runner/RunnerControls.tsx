import { StyleSheet, View } from 'react-native';

import { Button, Icon, ProgressBar, Text } from '@/components';
import { colors, spacing } from '@/theme';
import { FillButton } from '../components/FillButton';
import { formatClock, formatCountdown } from '../logic/timeline';

export interface RunnerControlsProps {
  t: number;
  /** Planned length; null for user-paced exercises (shows elapsed only). */
  totalMs: number | null;
  paused: boolean;
  color: string;
  onTogglePause: () => void;
  onFinishEarly: () => void;
  /** "I feel better" for Wait It Out, "Finish early" otherwise. */
  finishLabel: string;
  finishProminent?: boolean;
}

/** Bottom of the runner: elapsed / remaining scrubber + Pause/Resume + Finish early. */
export function RunnerControls({ t, totalMs, paused, color, onTogglePause, onFinishEarly, finishLabel, finishProminent }: RunnerControlsProps) {
  return (
    <View style={styles.wrap}>
      {totalMs != null ? (
        <View style={styles.timeRow}>
          <Text variant="caption" mono tabular tone="secondary" style={styles.timeLeft} testID="sos-elapsed">
            {formatClock(Math.min(t, totalMs))}
          </Text>
          <ProgressBar progress={t / totalMs} color={color} height={4} glow={false} style={styles.flex} />
          <Text variant="caption" mono tabular tone="secondary" style={styles.timeRight}>
            -{formatCountdown(totalMs - t)}
          </Text>
        </View>
      ) : (
        <View style={styles.elapsed}>
          <Icon name="timer-outline" size={15} color={colors.textTertiary} />
          <Text variant="captionStrong" mono tabular tone="secondary" testID="sos-elapsed">
            {formatClock(t)}
          </Text>
          <Text variant="caption" tone="tertiary">
            elapsed
          </Text>
        </View>
      )}
      <View style={styles.buttons}>
        <Button
          label={paused ? 'Resume' : 'Pause'}
          icon={paused ? 'play' : 'pause'}
          variant="secondary"
          fullWidth={false}
          onPress={onTogglePause}
          style={styles.flex}
          testID="sos-pause"
        />
        {finishProminent ? (
          <FillButton
            label={finishLabel}
            icon="emoticon-happy-outline"
            fill={color}
            fullWidth={false}
            onPress={onFinishEarly}
            style={styles.flex}
            testID="sos-finish"
          />
        ) : (
          <Button label={finishLabel} variant="secondary" fullWidth={false} onPress={onFinishEarly} style={styles.flex} testID="sos-finish" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  flex: { flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeLeft: { minWidth: 40 },
  timeRight: { minWidth: 44, textAlign: 'right' },
  elapsed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttons: { flexDirection: 'row', gap: spacing.md },
});
