import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon, ListGroup, ListRow, SectionHeader, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useDataActions } from '../useDataActions';

export function DataSection() {
  const { busy, status, exportData, importData, loadSampleData, resetData } = useDataActions();
  const spinner = <ActivityIndicator size="small" color={colors.textSecondary} />;

  return (
    <>
      <SectionHeader title="Data" icon="database-outline" />
      <ListGroup>
        <ListRow
          title="Export data"
          subtitle="Save a backup as a JSON file"
          icon="tray-arrow-up"
          iconColor={colors.info}
          onPress={() => void exportData()}
          right={busy === 'export' ? spinner : undefined}
          noChevron={busy === 'export'}
          testID="settings-export"
        />
        <ListRow
          title="Import data"
          subtitle="Restore from a backup file"
          icon="tray-arrow-down"
          iconColor={colors.accent}
          onPress={() => void importData()}
          right={busy === 'import' ? spinner : undefined}
          noChevron={busy === 'import'}
          testID="settings-import"
        />
        <ListRow
          title="Load sample data"
          subtitle="Explore Quit with example habits"
          icon="flask-outline"
          iconColor={colors.purple}
          onPress={() => void loadSampleData()}
          testID="settings-sample"
        />
        <ListRow title="Reset all data" subtitle="Delete everything and start over" icon="delete-forever-outline" destructive onPress={() => void resetData()} noChevron testID="settings-reset" />
      </ListGroup>
      {status ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.status} accessibilityLiveRegion="polite" testID="settings-data-status">
          <Icon name="check-circle" size={16} color={colors.success} />
          <Text variant="captionStrong" color={colors.success} style={styles.statusText} numberOfLines={2}>
            {status}
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.spacer} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  statusText: { flex: 1 },
  spacer: { height: 0 },
});
