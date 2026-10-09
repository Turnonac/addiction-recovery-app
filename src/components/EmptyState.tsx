import { StyleSheet, View } from 'react-native';

import { colors, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, color = colors.accent }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.circle, { backgroundColor: withAlpha(color, 0.15), borderColor: withAlpha(color, 0.35) }]}>
        <Icon name={icon} size={30} color={color} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="secondary" center style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  circle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: spacing.sm },
  message: { maxWidth: 320 },
});
