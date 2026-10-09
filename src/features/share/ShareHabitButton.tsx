import { IconButton } from '@/components';
import type { HabitSnapshot } from '@/domain/habitStats';

export interface ShareHabitButtonProps {
  snapshot: HabitSnapshot;
  size?: number;
}

// STUB — shares a progress card image for a habit.
export function ShareHabitButton({ size = 32 }: ShareHabitButtonProps) {
  return <IconButton icon="export-variant" size={size} iconSize={16} accessibilityLabel="Share progress" />;
}
