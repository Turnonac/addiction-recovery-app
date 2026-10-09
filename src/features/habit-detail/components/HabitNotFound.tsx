import { StyleSheet, View } from 'react-native';

import { Button, EmptyState } from '@/components';
import { useActiveHabits } from '@/store/selectors';
import { spacing } from '@/theme';
import { goHome } from '../navigation';

/**
 * "Habit not found" with a centered "Go home" button. (The shared EmptyState
 * action button aligns to the left, so the button is rendered here.)
 */
export function HabitNotFound() {
  const others = useActiveHabits().length;
  const message = others > 0 ? 'This habit may have been deleted. Your other habits are still on the home screen.' : 'This habit may have been deleted.';
  return (
    <View testID="habit-not-found">
      <EmptyState icon="help-circle-outline" title="Habit not found" message={message} />
      <Button label="Go home" icon="home-outline" fullWidth={false} onPress={goHome} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'center', marginTop: -spacing.md },
});
