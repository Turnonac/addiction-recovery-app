import { useLocalSearchParams } from 'expo-router';

import { HistoryScreen } from '@/features/habit-detail/history/HistoryScreen';

/** /habit/[id]/history — every streak of a habit. */
export default function StreakHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HistoryScreen habitId={id} />;
}
