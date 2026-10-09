import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, type EmptyStateProps } from '@/components';
import { colors, spacing } from '@/theme';
import type { IconName } from '@/types';

export interface JournalEmptyProps extends Pick<EmptyStateProps, 'title' | 'message'> {
  icon: IconName;
  actionLabel: string;
  actionIcon?: IconName;
  onAction: () => void;
  testID?: string;
}

/** EmptyState in the journal's purple, with its action button centered under the text. */
export function JournalEmpty({ icon, title, message, actionLabel, actionIcon, onAction, testID }: JournalEmptyProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <EmptyState icon={icon} color={colors.purple} title={title} message={message} />
      <Button label={actionLabel} icon={actionIcon} onPress={onAction} fullWidth={false} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: spacing.xxl },
  button: { alignSelf: 'center', marginTop: -spacing.md },
});
