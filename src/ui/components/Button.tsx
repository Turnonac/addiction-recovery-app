import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { ChevronLeft, type IconComponent } from '@/ui/icons';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  /**
   * primary = filled accent (main action); secondary = soft gray fill;
   * outline = transparent with border; ghost = text only (accent color);
   * danger = outlined, red text (e.g. "Remove partner").
   */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Icon drawn before the title, tinted like the title. */
  icon?: IconComponent;
  /** 'md' = min height 50 (default), 'lg' = 54 (screen footers). */
  size?: 'md' | 'lg';
  /**
   * Toggle-style "on" look (soft accent fill) for outline buttons such as
   * "I talked with James". Also sets accessibilityState.selected.
   */
  selected?: boolean;
  /** Only needed when the title alone is not self-describing. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  icon: Icon,
  size = 'md',
  selected,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const theme = useAppTheme();
  const red = theme.levels[3];

  let bg = 'transparent';
  let fg = theme.accentText;
  let border: string | undefined;
  switch (variant) {
    case 'primary':
      bg = theme.accent;
      fg = theme.onAccent;
      break;
    case 'secondary':
      bg = theme.surface2;
      fg = theme.text;
      break;
    case 'outline':
      bg = selected ? theme.accentSoft : 'transparent';
      fg = selected ? theme.accentText : theme.text;
      border = selected ? theme.accentSoft : theme.muted;
      break;
    case 'ghost':
      break;
    case 'danger':
      fg = red.ink;
      border = red.solid;
      break;
  }
  if (disabled) {
    fg = theme.muted;
    if (variant === 'primary' || variant === 'secondary') bg = theme.surface2;
    if (border !== undefined) border = theme.line;
  }

  const minHeight = variant === 'ghost' ? MIN_TOUCH : size === 'lg' ? 54 : 50;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: variant === 'ghost' ? 12 : 20,
          paddingVertical: 12,
          borderRadius: theme.buttonRadius,
          backgroundColor: bg,
          borderWidth: border !== undefined ? 1.5 : 0,
          borderColor: border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={20} color={fg} /> : null}
      <Text
        style={{
          flexShrink: 1,
          color: fg,
          fontSize: size === 'lg' ? 17 : 16,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export interface BackButtonProps {
  /** Visible text, usually the previous screen's name ("Today", "Settings"). */
  label: string;
  onPress: () => void;
  /** Default: "Back to {label}". */
  accessibilityLabel?: string;
}

/** The mockups' "‹ Today" back link: accent text, 44pt tall, aligned to the left edge. */
export function BackButton({ label, onPress, accessibilityLabel }: BackButtonProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Back to ${label}`}
      hitSlop={4}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        minHeight: MIN_TOUCH,
        marginLeft: -8,
        paddingHorizontal: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <ChevronLeft size={22} color={theme.accentText} />
      <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
