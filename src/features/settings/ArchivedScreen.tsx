import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button, EmptyState, Header, Screen, Text } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { useArchivedHabits } from '@/store/selectors';
import { colors, spacing } from '@/theme';
import type { Habit } from '@/types';
import { confirm } from '@/utils/confirm';
import { ArchivedHabitCard } from './components/ArchivedHabitCard';
import { deleteHabitMessage } from './logic/archived';

export function ArchivedScreen() {
  const habits = useArchivedHabits();
  const now = useNow(60_000);
  const setHabitArchived = useStore((s) => s.setHabitArchived);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const haptic = useHaptics();

  const restore = (h: Habit) => {
    haptic('success');
    setHabitArchived(h.id, false);
  };

  const remove = async (h: Habit) => {
    const relapseCount = useStore.getState().relapses.filter((r) => r.habitId === h.id).length;
    const ok = await confirm({
      title: `Delete ${h.name}?`,
      message: deleteHabitMessage(h.name, relapseCount),
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    haptic('warning');
    deleteHabit(h.id);
  };

  return (
    <Screen
      header={<Header title="Archived habits" large subtitle={habits.length ? 'Hidden from your home screen and stats' : undefined} />}
      glowColor={colors.warning}
      glowIntensity={0.18}
      testID="archived-screen"
    >
      {habits.length === 0 ? (
        <View>
          <EmptyState
            icon="archive-outline"
            color={colors.warning}
            title="No archived habits"
            message="When you archive a habit from its menu, it moves here. Its history is kept so you can restore it anytime."
          />
          <Button
            label="Back to settings"
            variant="secondary"
            fullWidth={false}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
            style={styles.back}
          />
        </View>
      ) : (
        <View style={styles.list}>
          {habits.map((h) => (
            <Animated.View key={h.id} layout={LinearTransition.duration(220)} exiting={FadeOut.duration(180)}>
              <ArchivedHabitCard habit={h} now={now} onRestore={() => restore(h)} onDelete={() => void remove(h)} />
            </Animated.View>
          ))}
          <Text variant="caption" tone="tertiary" center style={styles.note}>
            Restored habits keep their streak, relapses and savings.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingTop: spacing.sm },
  note: { marginTop: spacing.sm, paddingHorizontal: spacing.xl },
  // EmptyState's own action button is left-aligned; keep ours centered under the message.
  back: { alignSelf: 'center', marginTop: -spacing.md },
});
