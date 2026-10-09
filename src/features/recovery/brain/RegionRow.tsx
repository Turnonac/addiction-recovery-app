import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, ProgressBar, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { daysToGoLabel, keepTailTogether, percentInt, recoveryEtaLabel, type RegionView } from '../logic';

export interface RegionRowProps {
  region: RegionView;
  /** The description is shown under the row. */
  expanded: boolean;
  /** The region is selected on the brain (tinted border, no description). */
  highlighted?: boolean;
  onPress: () => void;
}

/** Row in the "AFFECTED REGIONS" list; expands to show the description. */
export function RegionRow({ region, expanded, highlighted = false, onPress }: RegionRowProps) {
  const pct = percentInt(region.recovery);
  const recovered = region.daysLeft === 0;
  const eta = recoveryEtaLabel(region);
  const toGo = daysToGoLabel(region.daysLeft);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      aria-expanded={expanded}
      accessibilityLabel={`${region.name}, ${pct}% recovered. ${eta}${toGo ? `, ${toGo}` : ''}`}
      style={({ pressed }) => [
        styles.card,
        (expanded || highlighted) && { borderColor: withAlpha(region.color, 0.45) },
        expanded && { backgroundColor: withAlpha(region.color, 0.08) },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: withAlpha(region.color, 0.14), borderColor: withAlpha(region.color, 0.3) }]}>
          {recovered ? (
            <Icon name="check" size={16} color={region.color} />
          ) : (
            <View style={[styles.dot, { backgroundColor: region.color, boxShadow: `0 0 10px ${withAlpha(region.color, 0.9)}` }]} />
          )}
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {region.name}
          </Text>
          {/* Wraps on narrow phones (320pt) rather than cutting off the number. */}
          <Text variant="caption" tone="tertiary" mono numberOfLines={2} style={styles.eta}>
            {keepTailTogether(eta)}
          </Text>
        </View>
        <Text variant="heading" color={region.color} tabular>
          {`${pct}%`}
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
      </View>
      <ProgressBar progress={region.recovery} color={region.color} height={4} style={styles.bar} />
      {expanded ? (
        <>
          <Text variant="caption" tone="secondary" style={styles.description}>
            {region.description}
          </Text>
          {toGo ? (
            <Text variant="caption" color={region.color} mono style={styles.toGo}>
              {toGo}
            </Text>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  text: { flex: 1 },
  eta: { marginTop: 2, fontSize: 11 },
  bar: { marginTop: spacing.md },
  description: { marginTop: spacing.md, lineHeight: 18 },
  toGo: { marginTop: spacing.sm, fontSize: 11, fontWeight: '700' },
});
