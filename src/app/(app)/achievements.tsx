import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header, Screen, SectionHeader, Text } from '@/components';
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_ORDER, nextClosest } from '@/domain/achievements';
import { AchievementBadge } from '@/features/achievements/AchievementBadge';
import { AchievementSheet } from '@/features/achievements/AchievementSheet';
import { AchievementSummary } from '@/features/achievements/AchievementSummary';
import { CertificatesSection } from '@/features/achievements/CertificatesSection';
import { certificateListItems } from '@/features/achievements/certificateLogic';
import { useAchievements } from '@/features/achievements/useAchievements';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';

export default function AchievementsScreen() {
  const now = useNow(60_000);
  const items = useAchievements(now);
  const habits = useStore((s) => s.habits);
  const unlocks = useStore((s) => s.unlocks);
  const haptic = useHaptics();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const next = nextClosest(items, unlocks.achievements);
  const nextView = next ? (items.find((i) => i.def.id === next.def.id) ?? null) : null;
  const certificates = certificateListItems(habits, unlocks, now);
  const selected = items.find((i) => i.def.id === selectedId) ?? null;

  const open = (id: string) => {
    haptic('selection');
    setSelectedId(id);
    setSheetOpen(true);
  };

  return (
    <View style={styles.flex}>
      <Screen header={<Header title="Achievements" left="back" />} glowColor={colors.gold} glowIntensity={0.28}>
        <AchievementSummary items={items} next={nextView} onOpen={open} />

        {CATEGORY_ORDER.map((category) => {
          const group = items.filter((i) => i.def.category === category);
          if (!group.length) return null;
          const done = group.filter((i) => i.isUnlocked).length;
          return (
            <View key={category}>
              <SectionHeader
                title={CATEGORY_LABELS[category]}
                icon={CATEGORY_ICONS[category]}
                right={
                  <Text variant="captionStrong" tone="tertiary" tabular>
                    {done} / {group.length}
                  </Text>
                }
              />
              <View style={styles.grid}>
                {group.map((item) => (
                  <AchievementBadge key={item.def.id} item={item} onPress={open} />
                ))}
              </View>
            </View>
          );
        })}

        <CertificatesSection items={certificates} />
      </Screen>
      <AchievementSheet item={selected} visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
});
