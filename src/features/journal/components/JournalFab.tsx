import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components';
import { colors, habitColors, spacing, withAlpha } from '@/theme';

export const FAB_SIZE = 56;

/** Space the list needs below its last item so the FAB never covers it. */
export function useFabClearance(): number {
  const insets = useSafeAreaInsets();
  return fabBottom(insets.bottom) + FAB_SIZE + spacing.lg;
}

function fabBottom(insetBottom: number): number {
  return Math.max(insetBottom, spacing.md) + spacing.md;
}

/** Purple circular "+" button, bottom-right above the safe area. */
export function JournalFab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: fabBottom(insets.bottom) }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="New journal entry"
        testID="journal-fab"
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <View style={styles.clip}>
          <LinearGradient
            colors={[habitColors.purple, habitColors.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[withAlpha(colors.text, 0.28), withAlpha(colors.text, 0)]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.6, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon name="plus" size={30} color={colors.text} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: spacing.xl },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.purple,
    boxShadow: `0 10px 28px ${withAlpha(colors.purple, 0.5)}`,
  },
  clip: {
    flex: 1,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.text, 0.25),
  },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.92 },
});
