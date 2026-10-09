import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, Header, Screen } from '@/components';
import { spacing } from '@/theme';

export interface MissingHabitProps {
  title: string;
  left?: 'back' | 'close';
}

/** Shown when the route's habit id no longer exists (e.g. it was deleted). */
export function MissingHabit({ title, left = 'back' }: MissingHabitProps) {
  return (
    <Screen header={<Header title={title} left={left} />}>
      <EmptyState
        icon="help-circle-outline"
        title="Habit not found"
        message="This habit may have been deleted. Your other habits are still on the home screen."
      />
      <View style={styles.action}>
        <Button label="Go to home" icon="home-outline" fullWidth={false} style={styles.button} onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: 'center', marginTop: -spacing.sm },
  button: { alignSelf: 'center' },
});
