import { Text, View } from 'react-native';

import { useAppTheme } from '@/ui/theme';

export interface AvatarProps {
  /** The first letter is shown; '?' if empty. */
  name: string;
  /** Diameter. Default 38 (settings row); the partner card uses 44. */
  size?: number;
}

/** Decorative initial circle for the partner. Hidden from screen readers (the name is next to it). */
export function Avatar({ name, size = 38 }: AvatarProps) {
  const theme = useAppTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.accentSoft,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={{ color: theme.accentText, fontSize: Math.round(size * 0.4), fontWeight: '800' }}
      >
        {initial}
      </Text>
    </View>
  );
}
