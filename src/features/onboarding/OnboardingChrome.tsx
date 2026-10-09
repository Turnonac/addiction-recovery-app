import { useState, type ReactNode, type RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components';
import { FORM_KEYBOARD_DISMISS_MODE, StickyFooter, type StickyFooterProps } from '@/features/habit-form/FormSection';
import { colors, radius, spacing } from '@/theme';
import { STAGES } from './onboardingModel';

export function StepDots({ active }: { active: number }) {
  return (
    <View style={styles.dots} accessibilityRole="progressbar" accessibilityLabel={`Step ${active + 1} of ${STAGES.length}`}>
      {STAGES.map((s, i) => (
        <View key={s} style={[styles.dot, i < active && styles.dotDone, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

export interface TopBarProps {
  stage: number;
  onBack?: () => void;
  onSkip?: () => void;
}

/** Back button · progress dots · optional Skip. */
export function OnboardingTopBar({ stage, onBack, onSkip }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>{onBack ? <IconButton icon="chevron-left" onPress={onBack} accessibilityLabel="Back" /> : null}</View>
      <StepDots active={stage} />
      <View style={[styles.side, styles.right]}>
        {onSkip ? (
          <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip" hitSlop={10} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
            <Text variant="bodyStrong" tone="secondary">
              Skip
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export interface StepLayoutProps {
  title?: string;
  subtitle?: string;
  /** Rendered above the title (e.g. an icon tile). */
  eyebrow?: ReactNode;
  children?: ReactNode;
  footer: Omit<StickyFooterProps, 'onLayout'>;
  /** Vertically center short content. */
  centered?: boolean;
  /** Lets a step scroll programmatically (e.g. to reveal an input). */
  scrollRef?: RefObject<ScrollView | null>;
}

/** Scrollable step content with a title block and a sticky CTA. */
export function StepLayout({ title, subtitle, eyebrow, children, footer, centered, scrollRef }: StepLayoutProps) {
  const [footerHeight, setFooterHeight] = useState(110);
  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, centered && styles.centered, { paddingBottom: footerHeight + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={FORM_KEYBOARD_DISMISS_MODE}
        showsVerticalScrollIndicator={false}
      >
        {eyebrow}
        {title ? (
          <Text variant="title" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="body" tone="secondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </ScrollView>
      <StickyFooter {...footer} onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, height: 56 },
  side: { width: 64, flexDirection: 'row' },
  right: { justifyContent: 'flex-end' },
  skip: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.cardStrong },
  dotDone: { backgroundColor: colors.textTertiary },
  dotActive: { width: 22, backgroundColor: colors.accent },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  centered: { flexGrow: 1, justifyContent: 'center' },
  title: { marginTop: spacing.sm },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xl },
});
