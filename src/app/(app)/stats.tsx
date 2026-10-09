import { useLocalSearchParams } from 'expo-router';

import { StatsScreen } from '@/features/stats/StatsScreen';
import { parseHabitId, parseTab } from '@/features/stats/scope';

/** /stats?habitId=&tab= — statistics modal (Streaks, Compare, Savings, Triggers, Mood). */
export default function StatisticsScreen() {
  const params = useLocalSearchParams<{ habitId?: string; tab?: string }>();
  return <StatsScreen initialHabitId={parseHabitId(params.habitId)} initialTab={parseTab(params.tab)} />;
}
