import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, QLogo, Text } from '@/components';
import { spacing } from '@/theme';

/** Shown on Home when there are no active habits. */
export function HomeEmptyState({ hasArchived }: { hasArchived: boolean }) {
  return (
    <View style={styles.wrap} testID="home-empty">
      <View style={styles.logo}>
        <QLogo size={72} glow />
      </View>
      <Text variant="title" center>
        Start your first quit
      </Text>
      <Text variant="body" tone="secondary" center style={styles.message}>
        Pick a habit you want to break. Quit counts every clean day, the money you keep and the time you win back.
      </Text>
      <Button label="Add a habit" icon="plus" onPress={() => router.push('/habit/new')} fullWidth={false} style={styles.cta} testID="home-empty-add" />
      {hasArchived ? (
        <Button label="Show archived habits" variant="ghost" size="sm" onPress={() => router.push('/settings/archived')} fullWidth={false} style={styles.secondary} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 72, paddingBottom: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md },
  logo: { marginBottom: spacing.lg },
  message: { maxWidth: 300 },
  cta: { alignSelf: 'center', marginTop: spacing.md, paddingHorizontal: spacing.xxl },
  secondary: { alignSelf: 'center' },
});
