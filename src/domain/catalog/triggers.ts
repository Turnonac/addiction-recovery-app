import type { IconName, TriggerId } from '@/types';

export interface TriggerDef {
  id: TriggerId;
  label: string;
  description: string;
  icon: IconName;
  color: string;
}

/** Relapse triggers. Order is the clockwise order of the radar chart axes. */
export const TRIGGERS: TriggerDef[] = [
  { id: 'stress', label: 'Stress', description: 'Work, money, pressure', icon: 'lightning-bolt', color: '#EF4444' },
  { id: 'loneliness', label: 'Loneliness', description: 'Late nights, being alone', icon: 'weather-night', color: '#8B5CF6' },
  { id: 'celebration', label: 'Celebration', description: 'Rewarding yourself, good news', icon: 'trophy-outline', color: '#EAB308' },
  { id: 'social', label: 'Social situation', description: 'Friends, parties, peer pressure', icon: 'account-group', color: '#6366F1' },
  { id: 'emotions', label: 'Emotions', description: 'Sadness, anger, anxiety', icon: 'heart', color: '#EC4899' },
  { id: 'habit_loop', label: 'Habit loop', description: 'Routine cue, autopilot', icon: 'sync', color: '#A855F7' },
  { id: 'fatigue', label: 'Fatigue', description: 'Tired, low energy', icon: 'battery-low', color: '#0EA5E9' },
  { id: 'boredom', label: 'Boredom', description: 'Nothing to do', icon: 'party-popper', color: '#F59E0B' },
  { id: 'conflict', label: 'Conflict', description: 'Arguments, tension', icon: 'chat-alert-outline', color: '#94A3B8' },
];

export function triggerFor(id: TriggerId): TriggerDef {
  return TRIGGERS.find((t) => t.id === id) ?? TRIGGERS[0];
}
