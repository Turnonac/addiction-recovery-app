import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, IconTile, Text } from '@/components';
import { colors, spacing } from '@/theme';

/** Entry row to the weekly review screen, under the habit cards. */
export function WeeklySummaryRow() {
  return (
    <Card onPress={() => router.push('/weekly')} padding={spacing.md} accessibilityLabel="Weekly summary. Your week in review" testID="home-weekly">
      <View style={styles.row}>
        <IconTile icon="calendar-week" color={colors.accent} size={40} />
        <View style={styles.texts}>
          <Text variant="bodyStrong">Weekly summary</Text>
          <Text variant="caption" tone="secondary">
            Your week in review
          </Text>
        </View>
        <Icon name="chevron-right" size={22} color={colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
});
