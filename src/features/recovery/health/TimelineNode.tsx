import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components';
import { colors, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import type { TimelineState } from '../logic';
import { GradientRing } from '../shared/GradientRing';
import { PulseHalo } from '../shared/PulseHalo';

export const NODE_SIZE = 34;

export interface TimelineNodeProps {
  state: TimelineState;
  color: string;
  icon: IconName;
  /** 0..1 progress, used by the current node's ring. */
  progress: number;
}

/**
 * Node on the timeline rail: achieved = filled check, current = progress ring with
 * a pulsing halo, upcoming = hollow and dim.
 */
export function TimelineNode({ state, color, icon, progress }: TimelineNodeProps) {
  if (state === 'achieved') {
    return (
      <View style={[styles.node, { backgroundColor: color, boxShadow: `0 0 10px ${withAlpha(color, 0.45)}` }]}>
        <Icon name="check" size={18} color={colors.text} />
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={styles.wrap}>
        <PulseHalo size={NODE_SIZE} color={withAlpha(color, 0.5)} maxScale={1.9} duration={2000} />
        <View style={[styles.currentBg, { backgroundColor: colors.bg }]} />
        <GradientRing progress={progress} size={NODE_SIZE} strokeWidth={3} color={color} trackColor={withAlpha(color, 0.22)}>
          <Icon name={icon} size={15} color={color} />
        </GradientRing>
      </View>
    );
  }
  return (
    <View style={[styles.node, styles.upcoming]}>
      <Icon name={icon} size={14} color={colors.textTertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center' },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  currentBg: { position: 'absolute', width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2 },
  upcoming: { borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.bg },
});
