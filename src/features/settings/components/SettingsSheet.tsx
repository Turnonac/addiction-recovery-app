import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';

export interface SettingsSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the content (e.g. a "Save" button). */
  footer?: ReactNode;
  /** Take most of the screen height (long lists). */
  tall?: boolean;
  testID?: string;
}

/**
 * Bottom sheet in a transparent Modal, matching the app's other pickers.
 * Mount only while open so every opening starts with fresh draft state.
 */
export function SettingsSheet({ title, subtitle, onClose, children, footer, tall, testID }: SettingsSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/*
        'padding' on Android too: with edge-to-edge (SDK 57) the Modal window is not
        resized for the keyboard. KAV pads only by the actual overlap with its own
        frame, so it can't double up where the window does resize.
      */}
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(280)}
          style={[styles.sheet, tall && styles.tall, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          testID={testID}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.titles}>
              <Text variant="heading" numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" tone="secondary" numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" size={34} iconSize={18} onPress={onClose} accessibilityLabel="Close" />
          </View>
          <View style={tall ? styles.flex : undefined}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  flex: { flex: 1 },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '92%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
  },
  tall: { height: '85%' },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  titles: { flex: 1, gap: 2 },
  footer: { paddingTop: spacing.lg },
});
