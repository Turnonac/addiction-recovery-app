import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { SectionHeader } from '@/ui/components/SectionHeader';
import { ChevronRight } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

export interface SettingsRowProps {
  title: string;
  subtitle?: string;
  /** Without onPress the row is plain (not a button). */
  onPress?: () => void;
  /** Leading element, e.g. <Avatar /> or <ColorDots />. */
  left?: ReactNode;
  /** Trailing value text, e.g. '9:00 PM'. */
  value?: string;
  /** Trailing accent action text, e.g. 'Edit' (replaces the chevron). */
  actionLabel?: string;
  /** Default: shown for pressable rows without an actionLabel and with tone 'default'. */
  showChevron?: boolean;
  /**
   * 'accent' = accent-colored title, for action rows like "Export backup file".
   * 'danger' = red title, for destructive action rows like "Delete all data".
   */
  tone?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** One row inside a SettingsGroup: optional icon, title + subtitle, trailing value / action / chevron. */
export function SettingsRow({
  title,
  subtitle,
  onPress,
  left,
  value,
  actionLabel,
  showChevron,
  tone = 'default',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: SettingsRowProps) {
  const theme = useAppTheme();
  const chevron = showChevron ?? (onPress !== undefined && actionLabel === undefined && tone === 'default');
  const titleColor = disabled
    ? theme.muted
    : tone === 'accent'
      ? theme.accentText
      : tone === 'danger'
        ? theme.levels[3].ink
        : theme.text;
  const strong = subtitle !== undefined || left !== undefined || tone !== 'default';

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: subtitle !== undefined || left !== undefined ? 56 : 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
  };

  const content = (
    <>
      {left}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: titleColor, fontSize: 16, fontWeight: strong ? '600' : '400' }}>
          {title}
        </Text>
        {subtitle !== undefined ? (
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>{subtitle}</Text>
        ) : null}
      </View>
      {value !== undefined ? (
        <Text
          style={{ color: disabled ? theme.muted : theme.text, fontSize: 16, fontWeight: '600' }}
        >
          {value}
        </Text>
      ) : null}
      {actionLabel !== undefined ? (
        <Text style={{ color: theme.accentText, fontSize: 15, fontWeight: '600' }}>
          {actionLabel}
        </Text>
      ) : null}
      {chevron ? <ChevronRight size={18} color={theme.muted} /> : null}
    </>
  );

  if (onPress === undefined) {
    return (
      <View style={rowStyle} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [rowStyle, { backgroundColor: pressed ? theme.surface2 : 'transparent' }]}
    >
      {content}
    </Pressable>
  );
}

export interface SettingsGroupProps {
  /** Uppercase section heading above the group. */
  title?: string;
  /** Muted note under the group. */
  footnote?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Rounded surface holding rows, with hairlines between them (settings sections). */
export function SettingsGroup({ title, footnote, children, style }: SettingsGroupProps) {
  const theme = useAppTheme();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{ gap: 8 }, style]}>
      {title !== undefined ? <SectionHeader title={title} /> : null}
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: theme.cardRadius,
          overflow: 'hidden',
        }}
      >
        {items.map((child, i) => (
          <Fragment key={child.key ?? i}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: theme.line }} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footnote !== undefined ? (
        <Text style={{ marginHorizontal: 4, color: theme.muted, fontSize: 12, lineHeight: 17 }}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

export interface SettingsNoteProps {
  children: string;
}

/** Muted paragraph inside a SettingsGroup (e.g. the "Your data lives on this phone" note). */
export function SettingsNote({ children }: SettingsNoteProps) {
  const theme = useAppTheme();
  return (
    <Text
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        color: theme.muted,
        fontSize: 14,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}
