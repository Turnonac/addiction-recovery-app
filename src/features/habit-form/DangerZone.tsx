import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow, SectionHeader, Text } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { Habit } from '@/types';
import { confirm } from '@/utils/confirm';
import { formatDate } from '@/utils/format';
import { useHabitFormControls } from './HabitForm';

/** Leave the edit modal and land on Home, skipping a detail screen whose habit is gone. */
function goHome() {
  if (router.canDismiss()) router.dismissTo('/');
  else router.replace('/');
}

export interface DangerZoneProps {
  habit: Habit;
  /** Called before leaving the screen so the form doesn't flash an empty state. */
  onLeaving?: () => void;
}

/** Restart / archive (or restore) / delete actions at the bottom of the edit screen. */
export function DangerZone({ habit, onLeaving }: DangerZoneProps) {
  const updateHabit = useStore((s) => s.updateHabit);
  const setHabitArchived = useStore((s) => s.setHabitArchived);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const haptic = useHaptics();
  const { dirty, leaveNow } = useHabitFormControls();
  // Each action is confirmed on its own, so leaving skips the form's "Discard changes?"
  // prompt; its confirmation says so instead when there are unsaved edits.
  const unsaved = dirty ? '\n\nUnsaved changes on this screen will be discarded.' : '';
  const leave = (action: () => void) =>
    leaveNow(() => {
      onLeaving?.();
      action();
    });

  const restart = async () => {
    const ok = await confirm({
      title: 'Restart streak now?',
      message: `Your ${habit.name} counter goes back to zero. No relapse is logged and your history stays as it is.${unsaved}`,
      confirmLabel: 'Restart',
      destructive: true,
    });
    if (!ok) return;
    leave(() => {
      // Keep the original first quit date: this is a reset, not a new habit.
      updateHabit(habit.id, { startedAt: Date.now(), firstStartedAt: habit.firstStartedAt });
      haptic('warning');
      if (router.canGoBack()) router.back();
      else router.replace(`/habit/${habit.id}`);
    });
  };

  const archive = async () => {
    const ok = await confirm({
      title: `Archive ${habit.name}?`,
      message: `It disappears from Home but keeps its history. You can restore it any time from Settings → Archived habits.${unsaved}`,
      confirmLabel: 'Archive',
    });
    if (!ok) return;
    leave(() => {
      setHabitArchived(habit.id, true);
      haptic('success');
      goHome();
    });
  };

  const restore = async () => {
    const ok = await confirm({
      title: `Restore ${habit.name}?`,
      message: `It goes back on Home with its streak and history intact.${unsaved}`,
      confirmLabel: 'Restore',
    });
    if (!ok) return;
    leave(() => {
      setHabitArchived(habit.id, false);
      haptic('success');
      if (router.canGoBack()) router.back();
      else router.replace(`/habit/${habit.id}`);
    });
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${habit.name}?`,
      message: 'This deletes its history, relapses and certificates. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    leave(() => {
      deleteHabit(habit.id);
      haptic('error');
      goHome();
    });
  };

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Danger zone" icon="alert-outline" />
      <ListGroup>
        <ListRow
          title="Restart streak now"
          subtitle="Reset the counter without logging a relapse"
          icon="restart"
          iconColor={colors.warning}
          onPress={restart}
          testID="restart-streak"
        />
        {habit.archived ? (
          <ListRow
            title="Restore to Home"
            subtitle="Archived — bring it back to Home"
            icon="archive-arrow-up-outline"
            iconColor={colors.success}
            onPress={restore}
            testID="restore-habit"
          />
        ) : (
          <ListRow
            title="Archive habit"
            subtitle="Hide it from Home, keep the history"
            icon="archive-outline"
            iconColor={colors.info}
            onPress={archive}
            testID="archive-habit"
          />
        )}
        <ListRow
          title="Delete habit"
          subtitle="Remove it and everything recorded for it"
          icon="trash-can-outline"
          destructive
          onPress={remove}
          testID="delete-habit"
        />
      </ListGroup>
      <Text variant="caption" tone="tertiary" style={styles.foot}>
        Tracking since {formatDate(habit.firstStartedAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  foot: { marginTop: spacing.sm, paddingHorizontal: 2 },
});
