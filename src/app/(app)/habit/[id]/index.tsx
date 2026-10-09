import { useLocalSearchParams } from 'expo-router';

import { DetailScreen } from '@/features/habit-detail/DetailScreen';

/** /habit/[id] — habit detail. */
export default function HabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetailScreen habitId={id} />;
}
