import { useLocalSearchParams } from 'expo-router';

import { RelapseScreen as RelapseFlow } from '@/features/relapse/RelapseScreen';

/** /habit/[id]/relapse — log a relapse (modal). */
export default function RelapseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RelapseFlow habitId={id} />;
}
