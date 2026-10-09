import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, GlowBackground, QLogo, Text } from '@/components';
import { colors, spacing } from '@/theme';
import type { LockCapability } from './biometrics';

export interface LockOverlayProps {
  /** 'locked' shows the unlock UI; 'privacy' is a plain cover for the app switcher. */
  mode: 'locked' | 'privacy';
  capability: LockCapability | null;
  onUnlock: () => void;
}

/** Opaque full-screen cover. Blocks every touch to the app underneath. */
export function LockOverlay({ mode, capability, onUnlock }: LockOverlayProps) {
  const insets = useSafeAreaInsets();
  const label = capability?.label ?? 'Face ID';
  return (
    <View style={styles.root} accessibilityViewIsModal importantForAccessibility="yes" testID="lock-overlay">
      <GlowBackground color={colors.accent} intensity={0.35} />
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <QLogo size={84} glow />
        {mode === 'locked' ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.texts}>
            <Text variant="title" center accessibilityRole="header">
              Quit is locked
            </Text>
            <Text variant="body" tone="secondary" center>
              Unlock with {label} to continue.
            </Text>
          </Animated.View>
        ) : null}
      </View>
      {mode === 'locked' ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Button label="Unlock" icon={capability?.icon ?? 'lock-open-variant-outline'} onPress={onUnlock} size="lg" testID="lock-unlock" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.bg, zIndex: 1000, elevation: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.xxl },
  texts: { gap: spacing.sm, alignItems: 'center' },
  bottom: { paddingHorizontal: spacing.xxl },
});
