import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { StyleProp, TextStyle } from 'react-native';

import { colors } from '@/theme';
import type { IconName } from '@/types';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** The single icon component used across the app (MaterialCommunityIcons). */
export function Icon({ name, size = 20, color = colors.text, style }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}
