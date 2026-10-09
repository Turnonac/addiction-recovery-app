import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, Screen, SectionHeader, Text } from '@/components';
import { brainRecoveryStats, getBrainProfile } from '@/domain/catalog/brain';
import { DAY, wholeDays } from '@/domain/time';
import { BrainSummaryCard } from '@/features/recovery/brain/BrainSummaryCard';
import { BrainVisual } from '@/features/recovery/brain/BrainVisual';
import { RecoveryRing } from '@/features/recovery/brain/RecoveryRing';
import { RegionRow } from '@/features/recovery/brain/RegionRow';
import { closeRegionPanel, NO_REGION_SELECTION, regionViews, tapRegionMarker, tapRegionRow, type RegionSelection } from '@/features/recovery/logic';
import { MissingHabit } from '@/features/recovery/shared/MissingHabit';
import { RecoveryDisclaimer } from '@/features/recovery/shared/RecoveryDisclaimer';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useHabit } from '@/store/selectors';
import { spacing } from '@/theme';

/** Brain recovery visualization for one habit (ref2/Nineth + Tenth frames). */
export default function BrainRecoveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabit(id);
  const now = useNow(60_000);
  const haptic = useHaptics();
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<RegionSelection>(NO_REGION_SELECTION);

  if (!habit) return <MissingHabit title="Brain recovery" left="close" />;

  const profile = getBrainProfile(habit.kind);
  const streakMs = Math.max(0, now - habit.startedAt);
  const cleanDays = streakMs / DAY;
  const stats = brainRecoveryStats(profile, cleanDays);
  const regions = regionViews(profile.regions, cleanDays);

  const update = (next: RegionSelection) => {
    haptic('selection');
    setSelection(next);
  };

  return (
    <Screen
      glowColor={habit.color}
      glowIntensity={0.6}
      scroll={false}
      contentStyle={styles.shell}
      header={<Header title="Brain recovery" left="close" right={<RecoveryRing value={stats.overall} color={habit.color} />} />}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        testID="brain-scroll"
      >
        <BrainSummaryCard name={habit.name} color={habit.color} streakDays={wholeDays(streakMs)} summary={profile.summary} />

        <BrainVisual
          regions={regions}
          selectedId={selection.selectedId}
          panelId={selection.panelId}
          onMarkerPress={(regionId) => update(tapRegionMarker(selection, regionId))}
          onClosePanel={() => update(closeRegionPanel(selection))}
          color={habit.color}
        />

        <SectionHeader title="AFFECTED REGIONS" right={<RegionCount recovered={stats.recovered} total={stats.total} />} />
        {regions.map((r) => (
          <RegionRow
            key={r.id}
            region={r}
            expanded={selection.expanded.includes(r.id)}
            highlighted={selection.selectedId === r.id}
            onPress={() => update(tapRegionRow(selection, r.id))}
          />
        ))}

        <RecoveryDisclaimer text="A simplified model based on published research — individual recovery varies. Not medical advice." />
      </ScrollView>
    </Screen>
  );
}

function RegionCount({ recovered, total }: { recovered: number; total: number }) {
  return (
    <Text variant="caption" tone="tertiary" mono>
      {`${recovered} / ${total} recovered`}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shell: { paddingHorizontal: 0, paddingBottom: 0 },
  content: { paddingHorizontal: spacing.lg },
});
