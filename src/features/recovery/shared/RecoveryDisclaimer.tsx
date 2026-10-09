import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import { colors, spacing } from '@/theme';

export interface RecoveryDisclaimerProps {
  text?: string;
}

/** Small centered footnote under the recovery screens. */
export function RecoveryDisclaimer({ text = 'General information based on public health sources — not medical advice.' }: RecoveryDisclaimerProps) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Icon name="information-outline" size={14} color={colors.textTertiary} />
      <Text variant="caption" tone="tertiary" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  text: { textAlign: 'center', lineHeight: 18 },
});
