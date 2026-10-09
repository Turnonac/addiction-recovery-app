import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, EmptyState, IconTile, SectionHeader, Text } from '@/components';
import { triggerFor } from '@/domain/catalog/triggers';
import { rankedTriggers, triggerBreakdown } from '@/domain/stats';
import { colors, spacing } from '@/theme';
import { plural } from '@/utils/format';
import { RadarChart } from '../charts/RadarChart';
import { StreakBarRow } from '../components/StreakBarRow';
import { roundPercent } from '../format';
import type { StatsData } from '../types';

/** Triggers: radar of relapse triggers plus a ranked list with shares. */
export function TriggersTab({ data }: { data: StatsData }) {
  const b = triggerBreakdown(data.relapses, data.habits);
  const ranked = rankedTriggers(b.items);

  if (b.relapseCount === 0) {
    return (
      <EmptyState
        icon="party-popper"
        color={colors.success}
        title="No relapses logged"
        message="Nothing to analyze yet 🎉 If you ever slip, note what triggered it and the patterns will show up here."
      />
    );
  }

  return (
    <View>
      <SectionHeader title="Relapse triggers" />
      <Card padding={spacing.md}>
        <RadarChart items={b.items} relapseCount={b.relapseCount} />
      </Card>

      {ranked.length ? (
        <Card padding={spacing.lg} style={styles.list}>
          {ranked.map((t, i) => {
            const def = triggerFor(t.trigger);
            return (
              <Fragment key={t.trigger}>
                {i > 0 && <View style={styles.divider} />}
                <View
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${def.label}: ${t.count} of ${b.relapseCount} relapses, ${roundPercent(t.share)}`}
                >
                  <IconTile icon={def.icon} color={def.color} size={40} />
                  <View style={styles.flex}>
                    <View style={styles.top}>
                      <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                        {def.label}
                      </Text>
                      <Text variant="bodyStrong" color={def.color} tabular>
                        {t.count}
                      </Text>
                      <Text variant="caption" tone="tertiary" tabular>
                        {` · ${roundPercent(t.share)}`}
                      </Text>
                    </View>
                    {/* Bars are relative to the most frequent trigger (full width), like the original. */}
                    <StreakBarRow value={t.relative} color={def.color} height={5} />
                    {data.scope === 'all' && t.habitNames.length ? (
                      <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.sub}>
                        {t.habitNames.join(', ')}
                      </Text>
                    ) : (
                      <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.sub}>
                        {def.description}
                      </Text>
                    )}
                  </View>
                </View>
              </Fragment>
            );
          })}
        </Card>
      ) : null}

      {b.untagged > 0 ? (
        <Text variant="caption" tone="tertiary" style={styles.footnote}>
          {`${plural(b.untagged, 'relapse')} without a trigger noted. Tagging triggers when you log a relapse makes this map sharper.`}
        </Text>
      ) : (
        <Text variant="caption" tone="tertiary" style={styles.footnote}>
          Percentages are shares of all relapses; one relapse can have several triggers.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  list: { marginTop: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  sub: { marginTop: 4 },
  footnote: { marginTop: spacing.md, paddingHorizontal: 2 },
});
