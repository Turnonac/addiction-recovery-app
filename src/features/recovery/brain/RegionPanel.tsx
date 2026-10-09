import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IconButton, Text } from '@/components';
import { radius, spacing, withAlpha } from '@/theme';
import { daysToGoLabel, keepTailTogether, percentInt, recoveryEtaLabel, type RegionView } from '../logic';

const CLOSE_SIZE = 28;

export interface RegionPanelProps {
  region: RegionView;
  /** Omitted for the invisible sizing copy: a same-size spacer replaces the close button. */
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Details of one brain region, shown under the brain after a marker tap. */
export function RegionPanel({ region, onClose, style, testID }: RegionPanelProps) {
  // No-break spaces: on narrow phones the line wraps between the two parts, not inside them.
  const toGo = daysToGoLabel(region.daysLeft).replace(/ /g, '\u00A0');
  return (
    <View
      style={[styles.panel, { borderColor: withAlpha(region.color, 0.4), backgroundColor: withAlpha(region.color, 0.1) }, style]}
      testID={testID}
    >
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: region.color, boxShadow: `0 0 8px ${withAlpha(region.color, 0.8)}` }]} />
        <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
          {region.name}
        </Text>
        <Text variant="subheading" color={region.color} tabular>
          {`${percentInt(region.recovery)}%`}
        </Text>
        {onClose ? (
          <IconButton icon="close" size={CLOSE_SIZE} iconSize={16} onPress={onClose} accessibilityLabel="Close region details" />
        ) : (
          <View style={styles.closeSpacer} />
        )}
      </View>
      <Text variant="caption" tone="tertiary" mono style={styles.eta}>
        {keepTailTogether(recoveryEtaLabel(region))}
        {toGo ? <Text variant="caption" color={region.color} mono style={styles.toGo}>{`  ·  ${toGo}`}</Text> : null}
      </Text>
      <Text variant="caption" tone="secondary" style={styles.text}>
        {region.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
  closeSpacer: { width: CLOSE_SIZE, height: CLOSE_SIZE },
  eta: { marginTop: 2, marginLeft: 18, fontSize: 11 },
  toGo: { fontSize: 11, fontWeight: '700' },
  text: { marginTop: spacing.sm, lineHeight: 18 },
});
