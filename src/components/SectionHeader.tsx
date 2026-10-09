import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  icon?: IconName;
  /** Right side: a counter like "5 / 7", a link, etc. */
  right?: ReactNode;
}

/** Mono uppercase section label, e.g. "▣ HEALTH RECOVERY            5 / 7". */
export function SectionHeader({ title, icon, right }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon && <Icon name={icon} size={14} color={colors.textTertiary} />}
        <Text variant="overline" tone="tertiary">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
