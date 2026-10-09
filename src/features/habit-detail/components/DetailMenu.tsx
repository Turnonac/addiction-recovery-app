import { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconTile, ListGroup, ListRow, Text } from '@/components';
import type { Habit } from '@/types';
import { colors, radius, spacing } from '@/theme';

export type DetailMenuAction = 'edit' | 'stats' | 'journal' | 'history' | 'share' | 'archive' | 'restore' | 'delete';

export interface DetailMenuProps {
  visible: boolean;
  habit: Habit;
  /** "31 days clean" */
  subtitle: string;
  onClose: () => void;
  /** Called after the menu has finished closing, never while its Modal is still on screen. */
  onAction: (action: DetailMenuAction) => void;
}

/** Android / web: wait out the Modal's close before acting (web usually reports it sooner via onDismiss). */
const CLOSE_DELAY_MS = 250;
/** iOS acts on `onDismiss`; this is only a safety net in case it never fires. */
const IOS_FALLBACK_MS = 900;
/** Backdrop left above the sheet (below the status bar) so it can always be tapped away. */
const TOP_CLEARANCE = 24;

/**
 * "…" menu of the habit detail screen as a bottom sheet in a transparent Modal,
 * so it works the same on iOS, Android and web.
 */
export function DetailMenu({ visible, habit, subtitle, onClose, onAction }: DetailMenuProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // The chosen action waits until the Modal is gone: presenting a native modal,
  // the share sheet or an alert while an RN Modal is still dismissing can fail on iOS.
  const pending = useRef<DetailMenuAction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const action = pending.current;
    pending.current = null;
    if (action) onAction(action);
  };

  const pick = (a: DetailMenuAction) => {
    if (pending.current) return;
    pending.current = a;
    onClose();
    timer.current = setTimeout(flush, Platform.OS === 'ios' ? IOS_FALLBACK_MS : CLOSE_DELAY_MS);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} onDismiss={flush} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(160)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg), maxHeight: windowHeight - insets.top - TOP_CLEARANCE }]}
          accessibilityViewIsModal
          testID="detail-menu"
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <IconTile icon={habit.icon} color={habit.color} size={44} />
            <View style={styles.headText}>
              <Text variant="subheading" numberOfLines={1}>
                {habit.name}
              </Text>
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>
          {/* Head and Cancel stay put; the actions scroll when the sheet would not fit (320×568). */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.groups} bounces={false} showsVerticalScrollIndicator={false}>
            <ListGroup>
              <ListRow title="Edit habit" icon="pencil-outline" iconColor={colors.accent} onPress={() => pick('edit')} testID="menu-edit" />
              <ListRow title="Statistics" icon="chart-box-outline" iconColor={colors.info} onPress={() => pick('stats')} testID="menu-stats" />
              <ListRow title="Write in journal" icon="notebook-edit-outline" iconColor={colors.purple} onPress={() => pick('journal')} testID="menu-journal" />
              <ListRow title="Streak history" icon="history" iconColor={colors.gold} onPress={() => pick('history')} testID="menu-history" />
              <ListRow title="Share progress" icon="export-variant" iconColor={colors.success} onPress={() => pick('share')} noChevron testID="menu-share" />
            </ListGroup>
            <ListGroup>
              {habit.archived ? (
                <ListRow title="Restore to Home" icon="archive-arrow-up-outline" iconColor={colors.success} onPress={() => pick('restore')} noChevron testID="menu-restore" />
              ) : (
                <ListRow title="Archive" icon="archive-arrow-down-outline" iconColor={colors.warning} onPress={() => pick('archive')} noChevron testID="menu-archive" />
              )}
              <ListRow title="Delete habit" icon="trash-can-outline" destructive onPress={() => pick('delete')} noChevron testID="menu-delete" />
            </ListGroup>
          </ScrollView>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </Animated.View>
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
    gap: spacing.md,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  groups: { gap: spacing.md },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  headText: { flex: 1, gap: 2 },
});
