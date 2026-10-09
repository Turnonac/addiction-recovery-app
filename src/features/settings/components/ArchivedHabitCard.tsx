import { StyleSheet, View } from 'react-native';

import { Button, Card, IconTile, Text } from '@/components';
import { spacing } from '@/theme';
import type { Habit } from '@/types';
import { archivedSubtitle } from '../logic/archived';

export interface ArchivedHabitCardProps {
  habit: Habit;
  now: number;
  onRestore: () => void;
  onDelete: () => void;
}

export function ArchivedHabitCard({ habit, now, onRestore, onDelete }: ArchivedHabitCardProps) {
  return (
    <Card tint={habit.color} tintStrength={0.06} testID={`archived-${habit.id}`}>
      <View style={styles.top}>
        <IconTile icon={habit.icon} color={habit.color} size={44} />
        <View style={styles.texts}>
          <Text variant="subheading" numberOfLines={1}>
            {habit.name}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {archivedSubtitle(habit, now)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label="Restore"
          icon="archive-arrow-up-outline"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={onRestore}
          style={styles.action}
          accessibilityLabel={`Restore ${habit.name}`}
          testID={`restore-${habit.id}`}
        />
        <Button
          label="Delete"
          icon="trash-can-outline"
          variant="danger"
          size="sm"
          fullWidth={false}
          onPress={onDelete}
          style={styles.action}
          accessibilityLabel={`Delete ${habit.name}`}
          testID={`delete-${habit.id}`}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  action: { flex: 1 },
});
