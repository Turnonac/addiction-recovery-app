import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, fonts, type as typeScale } from '@/theme';

export type TextVariant = keyof typeof typeScale;
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Overrides tone. */
  color?: string;
  mono?: boolean;
  center?: boolean;
  /** Use tabular figures so ticking numbers don't jitter. */
  tabular?: boolean;
}

const toneColor: Record<TextTone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  inverse: colors.textInverse,
};

export function Text({ variant = 'body', tone = 'primary', color, mono, center, tabular, style, ...rest }: TextProps) {
  const base = typeScale[variant] as TextStyle;
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: color ?? toneColor[tone] },
        mono && { fontFamily: fonts.mono },
        center && { textAlign: 'center' },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
