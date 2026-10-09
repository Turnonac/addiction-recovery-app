import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme';
import { GlowBackground } from './GlowBackground';

export interface ScreenProps {
  children: ReactNode;
  /** Fixed header rendered above the scroll area (e.g. <Header />). */
  header?: ReactNode;
  /** Fixed footer rendered over the bottom (e.g. a floating action bar). */
  footer?: ReactNode;
  /** Glow color for the background; defaults to a warm neutral. */
  glowColor?: string;
  glowIntensity?: number;
  scroll?: boolean;
  /** Extra bottom padding for content so it can scroll above a floating footer. */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Wrap in KeyboardAvoidingView (forms). */
  keyboard?: boolean;
  /** Apply the top safe-area inset. Turn off for modals presented as sheets. */
  safeTop?: boolean;
  testID?: string;
}

/** Standard screen shell: glow background, safe areas, optional scroll/header/footer. */
export function Screen({
  children,
  header,
  footer,
  glowColor,
  glowIntensity,
  scroll = true,
  bottomInset = 0,
  contentStyle,
  keyboard,
  safeTop = true,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl + bottomInset }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, { paddingBottom: insets.bottom + bottomInset }, contentStyle]}>{children}</View>
  );

  const inner = (
    <View style={[styles.flex, { paddingTop: safeTop ? insets.top : 0 }]} testID={testID}>
      {header}
      {body}
      {footer}
    </View>
  );

  return (
    <View style={styles.flex}>
      <GlowBackground color={glowColor} intensity={glowIntensity} />
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
});
