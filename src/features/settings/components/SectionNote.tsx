import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, spacing } from '@/theme';
import type { IconName } from '@/types';

/** Small footnote under a settings group, like iOS group footers. */
export function SectionNote({ text, icon = 'information-outline', color = colors.textTertiary }: { text: string; icon?: IconName; color?: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={14} color={color} style={styles.icon} />
      <Text variant="caption" color={color} style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.xs, marginTop: spacing.sm },
  icon: { marginTop: 1 },
  text: { flex: 1, lineHeight: 18 },
});
