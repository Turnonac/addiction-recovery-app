import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FLOATING_BAR_HEIGHT, FloatingBar, FloatingBarItem, Icon } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, withAlpha } from '@/theme';

const FAB_SIZE = 56;
/** Dark ring around the white button that sets it apart from content scrolling under it. */
const FAB_RING = 5;
/** How far the "+" button rises above the top edge of the bar. */
const FAB_RISE = FAB_SIZE - 12;

/** Extra scroll padding Home needs so the last card clears the bar and the "+" button. */
export const HOME_BOTTOM_INSET = FLOATING_BAR_HEIGHT + FAB_RISE + FAB_RING + spacing.sm;

/** Frosted SOS · Journal bar with the white "+" button floating over its center. */
export function HomeFloatingBar() {
  const insets = useSafeAreaInsets();
  const haptic = useHaptics();
  const barBottom = Math.max(insets.bottom, spacing.md);

  return (
    <>
      <FloatingBar>
        <FloatingBarItem
          label="SOS"
          icon="lifebuoy"
          color={colors.danger}
          testID="home-sos"
          onPress={() => {
            haptic('medium');
            router.push('/sos');
          }}
        />
        <View style={styles.gap} />
        <FloatingBarItem label="Journal" icon="notebook-outline" color={colors.accent} testID="home-journal" onPress={() => router.push('/journal')} />
      </FloatingBar>
      <View pointerEvents="box-none" style={[styles.fabWrap, { bottom: barBottom + FLOATING_BAR_HEIGHT - FAB_SIZE + FAB_RISE - FAB_RING }]}>
        <Pressable
          onPress={() => {
            haptic('light');
            router.push('/habit/new');
          }}
          accessibilityRole="button"
          accessibilityLabel="Add habit"
          testID="home-add"
          hitSlop={4}
          style={({ pressed }) => [styles.ring, pressed && styles.fabPressed]}
        >
          <View style={styles.fab}>
            <Icon name="plus" size={30} color={colors.textInverse} />
          </View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { width: FAB_SIZE + spacing.lg },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  ring: {
    width: FAB_SIZE + FAB_RING * 2,
    height: FAB_SIZE + FAB_RING * 2,
    borderRadius: FAB_SIZE / 2 + FAB_RING,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.bg, 0.88),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.text, 0.28),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    // A soft light glow: a dark shadow would vanish on the near-black canvas.
    shadowColor: colors.text,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.92 },
});
