import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';

import { BackButton, Screen, ScreenHeader, StepProgress } from '@/ui/components';
import { Check } from '@/ui/icons';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';

/** Counted onboarding steps (welcome … reminder); "done" is not counted. */
export const ONBOARDING_STEPS = 6;

export interface StepScreenProps {
  /** 1-based step for the progress bar; omit to hide it (final screen). */
  step?: number;
  /** Text under the progress bar. Default 'Step {step} of 6'. */
  caption?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  footer: ReactNode;
  avoidKeyboard?: boolean;
  children?: ReactNode;
}

/** Shared frame for every onboarding page: back link, progress, title, content, pinned footer. */
export function StepScreen({
  step,
  caption,
  title,
  subtitle,
  onBack,
  footer,
  avoidKeyboard = false,
  children,
}: StepScreenProps) {
  // Each step mounts fresh (keyed by the parent), so tell screen readers where they are.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(title);
  }, [title]);

  return (
    <Screen edges={['top', 'bottom']} footer={footer} gap={18} avoidKeyboard={avoidKeyboard}>
      {onBack ? <BackButton label="Back" onPress={onBack} accessibilityLabel="Previous step" /> : null}
      {step !== undefined ? (
        <StepProgress step={step} total={ONBOARDING_STEPS} caption={caption} />
      ) : null}
      <ScreenHeader size="md" title={title} subtitle={subtitle} />
      {children}
    </Screen>
  );
}

export interface CheckListProps {
  items: readonly string[];
}

/** Card of short promises with check marks (welcome, partner step). */
export function CheckList({ items }: CheckListProps) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: theme.radius,
      }}
    >
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ paddingTop: 1 }}>
            <Check size={18} color={theme.accentText} strokeWidth={2.6} />
          </View>
          <Text style={{ flex: 1, color: theme.text, fontSize: 14, lineHeight: 20 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export interface TextLinkProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Quiet muted text button under the main action ("Skip for now · …"). */
export function TextLink({ title, onPress, disabled = false, accessibilityHint }: TextLinkProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: theme.muted, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
        {title}
      </Text>
    </Pressable>
  );
}
