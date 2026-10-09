import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Direct imports (not '@/components'): DateTimeField in components uses this
// sheet, and going through the barrel would create a require cycle.
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

export interface SheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the content (e.g. a "Done" button). */
  footer?: ReactNode;
  /** Take most of the screen height (long lists). */
  tall?: boolean;
  testID?: string;
}

/**
 * Bottom sheet presented in a transparent Modal. Mount it only while open —
 * every mount starts fresh, which keeps draft state simple for callers.
 */
export function Sheet({ title, subtitle, onClose, children, footer, tall, testID }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <Text variant="subheading" numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" tone="secondary" numberOfLines={1}>
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
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  titles: { flex: 1, gap: 2 },
  footer: { paddingTop: spacing.md },
});
