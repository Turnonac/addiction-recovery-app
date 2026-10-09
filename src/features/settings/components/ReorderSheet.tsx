import { ScrollView, StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Button, EmptyState, IconButton, IconTile, Text } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { useActiveHabits } from '@/store/selectors';
import { colors, radius, spacing } from '@/theme';
import { fullOrder, moveId } from '../logic/reorder';
import { SettingsSheet } from './SettingsSheet';

/** Reorder active habits with up/down buttons. Changes apply immediately. */
export function ReorderSheet({ onClose }: { onClose: () => void }) {
  const habits = useActiveHabits();
  const reorderHabits = useStore((s) => s.reorderHabits);
  const haptic = useHaptics();
  const ids = habits.map((h) => h.id);

  const move = (id: string, delta: -1 | 1) => {
    const next = moveId(ids, id, delta);
    if (next.join() === ids.join()) return;
    haptic('selection');
    // Renumber archived habits too, so none of them shares a position with an active one.
    reorderHabits(fullOrder(next, useStore.getState().habits));
  };

  return (
    <SettingsSheet
      title="Reorder habits"
      subtitle="This is the order on your home screen."
      onClose={onClose}
      testID="reorder-sheet"
      footer={<Button label="Done" onPress={onClose} testID="reorder-done" />}
    >
      {habits.length < 2 ? (
        <EmptyState
          icon="swap-vertical"
          title={habits.length ? 'Only one habit' : 'No habits yet'}
          message="Add at least two habits to change their order on your home screen."
        />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {habits.map((h, i) => (
            <Animated.View key={h.id} layout={LinearTransition.duration(220)} style={styles.row} testID={`reorder-row-${h.id}`}>
              <Text variant="captionStrong" tone="tertiary" mono tabular numberOfLines={1} style={styles.index}>
                {i + 1}
              </Text>
              <IconTile icon={h.icon} color={h.color} size={38} />
              <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
                {h.name}
              </Text>
              <IconButton
                icon="chevron-up"
                size={36}
                onPress={() => move(h.id, -1)}
                disabled={i === 0}
                accessibilityLabel={`Move ${h.name} up`}
                testID={`reorder-up-${h.id}`}
              />
              <IconButton
                icon="chevron-down"
                size={36}
                onPress={() => move(h.id, 1)}
                disabled={i === habits.length - 1}
                accessibilityLabel={`Move ${h.name} down`}
                testID={`reorder-down-${h.id}`}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  index: { minWidth: 22, textAlign: 'center' },
  name: { flex: 1 },
});
