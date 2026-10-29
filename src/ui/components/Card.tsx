import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/ui/theme';

export interface CardProps extends Omit<ViewProps, 'style'> {
  children?: ReactNode;
  /**
   * default = surface with hairline border;
   * accent = soft accent fill with accent border (e.g. "Add your partner").
   */
  variant?: 'default' | 'accent';
  /** Tighter padding and smaller radius (stat tiles). */
  compact?: boolean;
  /** Space between children. Default 14 (2 when compact). */
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/** Rounded surface used for every card in the mockups. */
export function Card({
  children,
  variant = 'default',
  compact = false,
  gap,
  style,
  ...rest
}: CardProps) {
  const theme = useAppTheme();
  const accent = variant === 'accent';
  return (
    <View
      {...rest}
      style={[
        {
          gap: gap ?? (compact ? 2 : 14),
          paddingVertical: compact ? 12 : 18,
          paddingHorizontal: compact ? 12 : 20,
          backgroundColor: accent ? theme.accentSoft : theme.surface,
          borderWidth: accent ? 1.5 : 1,
          borderColor: accent ? theme.accent : theme.line,
          borderRadius: compact ? theme.cardRadius : theme.radius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface StatTileProps {
  /** Big number or short value, e.g. '23' or '24/28'. */
  value: string;
  /** Caption under the value, e.g. 'Days since last Red'. */
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** Compact stat card (History header). Read as one element: "23, Days since last Red". */
export function StatTile({ value, label, style }: StatTileProps) {
  const theme = useAppTheme();
  return (
    <Card
      compact
      accessible
      accessibilityLabel={`${value}, ${label}`}
      style={[{ flex: 1 }, style]}
    >
      <Text
        style={{ color: theme.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.48 }}
        maxFontSizeMultiplier={1.6}
      >
        {value}
      </Text>
      <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 16 }}>{label}</Text>
    </Card>
  );
}
