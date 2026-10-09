import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button, IconTile, ListGroup, ListRow, Text } from '@/components';
import type { HabitSnapshot } from '@/domain/habitStats';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { colors, radius, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { streakDisplay } from './homeLogic';

export interface HabitActionSheetProps {
  /** Habit whose actions are shown; null hides the sheet. */
  snapshot: HabitSnapshot | null;
  onClose: () => void;
}

const OPEN_MS = 300;
const CLOSE_MS = 220;
/** iOS runs the chosen action on the Modal's `onDismiss`; this is only a safety net in case it never fires. */
const IOS_FALLBACK_MS = 600;

/**
 * Long-press menu for a habit card: Edit · Log relapse · Statistics · Archive.
 * Like an iOS action sheet, the panel slides up from the bottom while the
 * backdrop fades in, and slides back down before the chosen action runs.
 */
export function HabitActionSheet({ snapshot, onClose }: HabitActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const haptic = useHaptics();
  const setHabitArchived = useStore((s) => s.setHabitArchived);
  const habit = snapshot?.habit;

  /** 0 = hidden below the screen, 1 = fully shown. */
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(0);
  const opened = useRef(false);
  const closing = useRef(false);
  // The chosen action waits until the Modal is gone: pushing a modal screen or
  // showing an alert while an RN Modal is still on screen can fail on iOS.
  const pending = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * (sheetHeight.get() || windowHeight) }],
  }));

  // Slide in once the panel has been measured, so it starts right below the screen edge.
  const onSheetLayout = (e: LayoutChangeEvent) => {
    sheetHeight.set(e.nativeEvent.layout.height);
    if (opened.current) return;
    opened.current = true;
    progress.set(withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
  };

  const runPending = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const action = pending.current;
    pending.current = null;
    action?.();
  };

  const finishClose = () => {
    opened.current = false;
    closing.current = false;
    onClose();
    if (!pending.current) return;
    // Android and web hide the (unanimated) Modal right away; iOS reports it via onDismiss.
    timer.current = setTimeout(runPending, Platform.OS === 'ios' ? IOS_FALLBACK_MS : 0);
  };

  /** Slides the sheet out, hides the Modal, then runs `action` once the Modal is gone. */
  const dismiss = (action?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    pending.current = action ?? null;
    progress.set(
      withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) }, () => {
        scheduleOnRN(finishClose);
      }),
    );
  };

  const go = (href: string) => dismiss(() => router.push(href));

  const archive = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Archive ${name}?`,
      message: 'It will be hidden from Home. Your progress is kept and you can restore it from Settings → Archived habits.',
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) return;
    setHabitArchived(id, true);
    haptic('success');
  };

  const streak = snapshot ? streakDisplay(snapshot.streakMs) : null;

  return (
    <Modal visible={!!snapshot} transparent animationType="none" onRequestClose={() => dismiss()} onDismiss={runPending} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} accessibilityRole="button" accessibilityLabel="Close menu" />
        </Animated.View>
        {habit && streak ? (
          <Animated.View
            onLayout={onSheetLayout}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }, sheetStyle]}
            accessibilityViewIsModal
            testID="habit-action-sheet"
          >
            <View style={styles.handle} />
            <View style={styles.head}>
              <IconTile icon={habit.icon} color={habit.color} size={44} />
              <View style={styles.headText}>
                <Text variant="subheading" numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text variant="caption" tone="secondary">
                  {`${streak.value} ${streak.unit} clean`}
                </Text>
              </View>
            </View>
            <ListGroup>
              <ListRow title="Edit habit" icon="pencil-outline" iconColor={colors.accent} onPress={() => go(`/habit/${habit.id}/edit`)} />
              <ListRow title="Log relapse" icon="restart" iconColor={colors.fire} onPress={() => go(`/habit/${habit.id}/relapse`)} />
              <ListRow
                title="Statistics"
                icon="chart-box-outline"
                iconColor={colors.info}
                onPress={() => go(`/stats?habitId=${encodeURIComponent(habit.id)}`)}
              />
              <ListRow
                title="Archive"
                icon="archive-arrow-down-outline"
                destructive
                noChevron
                onPress={() => dismiss(() => void archive(habit.id, habit.name))}
              />
            </ListGroup>
            <Button label="Cancel" variant="secondary" onPress={() => dismiss()} style={styles.cancel} />
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  headText: { flex: 1, gap: 2 },
  cancel: { marginTop: -spacing.xs },
});
