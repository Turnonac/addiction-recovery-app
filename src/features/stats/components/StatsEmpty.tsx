import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, type EmptyStateProps } from '@/components';
import { spacing } from '@/theme';

/** EmptyState with its action button centered under the message. */
export function StatsEmpty({ actionLabel, onAction, ...rest }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <EmptyState {...rest} />
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} fullWidth={false} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  button: { alignSelf: 'center', marginTop: -spacing.md },
});
