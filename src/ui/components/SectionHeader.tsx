import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useAppTheme } from '@/ui/theme';

export interface SectionHeaderProps {
  title: string;
  style?: StyleProp<TextStyle>;
}

/** Small uppercase muted heading above a settings group ("RECOVERY"). */
export function SectionHeader({ title, style }: SectionHeaderProps) {
  const theme = useAppTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[
        {
          marginHorizontal: 4,
          color: theme.muted,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.52,
          textTransform: 'uppercase',
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
}
