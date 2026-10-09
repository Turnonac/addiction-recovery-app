import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';

export interface IconTileProps {
  icon: IconName;
  color: string;
  size?: number;
  /** 'square' = rounded square (exercise list, journal), 'circle' = round (stats). */
  shape?: 'square' | 'circle';
  style?: StyleProp<ViewStyle>;
}

/** Icon on a tinted tile in the icon's color. */
export function IconTile({ icon, color, size = 44, shape = 'square', style }: IconTileProps) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : Math.min(radius.md, size * 0.3),
          backgroundColor: withAlpha(color, 0.16),
          borderColor: withAlpha(color, 0.3),
        },
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
