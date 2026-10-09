import { StyleSheet, View } from 'react-native';

import { IconTile, Text } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import type { MoodStat } from '@/domain/stats';
import { radius, spacing, withAlpha } from '@/theme';
import { roundPercent } from '../format';

const TRACK = 112;

/** Five vertical bars (worst → best): journal moods solid, relapse moods faded on top. */
export function MoodBars({ stats }: { stats: MoodStat[] }) {
  const max = Math.max(1, ...stats.map((s) => s.count));
  return (
    <View style={styles.row}>
      {stats.map((s) => {
        const def = moodFor(s.mood);
        const jh = (s.journal / max) * TRACK;
        const rh = (s.relapses / max) * TRACK;
        return (
          <View key={s.mood} style={styles.col} accessible accessibilityLabel={`${def.label}: ${s.count}`}>
            <Text variant="captionStrong" color={s.count ? def.color : undefined} tone="tertiary" tabular>
              {s.count}
            </Text>
            <View style={styles.track}>
              {s.relapses > 0 && <View style={[styles.seg, styles.segTop, { height: rh, backgroundColor: withAlpha(def.color, 0.35) }]} />}
              {s.journal > 0 && (
                <View
                  style={[
                    styles.seg,
                    s.relapses ? null : styles.segTop,
                    { height: jh, backgroundColor: def.color, shadowColor: def.color },
                    styles.glow,
                  ]}
                />
              )}
            </View>
            <IconTile icon={def.icon} color={def.color} size={32} shape="circle" />
            <Text variant="micro" tone="secondary" numberOfLines={1}>
              {def.label}
            </Text>
            <Text variant="micro" tone="tertiary" tabular>
              {roundPercent(s.share)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  track: {
    height: TRACK,
    width: 26,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  seg: { width: '100%' },
  segTop: { borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  glow: { shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
});
