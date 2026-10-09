import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, SectionHeader, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';

/**
 * Form scroll views hide the keyboard when dragged. Not on web: react-native-web
 * blurs the focused input on every scroll there — wheel, or the browser scrolling
 * a just-focused field into view — which would close an input as it opens.
 */
export const FORM_KEYBOARD_DISMISS_MODE = Platform.OS === 'web' ? 'none' : 'on-drag';

export interface FormSectionProps {
  title: string;
  icon?: IconName;
  /** Small text on the right of the header (e.g. "Optional"). */
  aside?: string;
  children: ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
}

/** Mono uppercase section label + content. */
export function FormSection({ title, icon, aside, children, onLayout }: FormSectionProps) {
  return (
    <View onLayout={onLayout}>
      <SectionHeader
        title={title}
        icon={icon}
        right={
          aside ? (
            <Text variant="micro" tone="tertiary">
              {aside}
            </Text>
          ) : undefined
        }
      />
      {children}
    </View>
  );
}

export interface StickyFooterProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  /** Small line above the button, e.g. a validation summary. */
  note?: string;
  noteTone?: 'error' | 'muted';
  /** Report the footer height so scroll content can pad under it. */
  onLayout?: (e: LayoutChangeEvent) => void;
  testID?: string;
}

/** Primary CTA pinned over the bottom of a scroll view, fading the content behind it. */
export function StickyFooter({ label, onPress, disabled, loading, icon, iconRight, note, noteTone = 'muted', onLayout, testID }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]} onLayout={onLayout} pointerEvents="box-none">
      <LinearGradient
        colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.92), colors.bg]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {note ? (
        <View style={[styles.note, noteTone === 'error' && styles.noteError]} accessibilityLiveRegion="polite">
          {noteTone === 'error' ? <Icon name="alert-circle-outline" size={14} color={colors.danger} /> : null}
          <Text variant="captionStrong" color={noteTone === 'error' ? colors.danger : colors.textSecondary}>
            {note}
          </Text>
        </View>
      ) : null}
      <Button label={label} onPress={onPress} disabled={disabled} loading={loading} size="lg" icon={icon} iconRight={iconRight} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl },
  note: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  noteError: { borderColor: withAlpha(colors.danger, 0.5) },
});
