import { useStore } from '@/store';
import type { SosSession } from '@/types';

export type SosSessionPatch = Partial<Pick<SosSession, 'intensityAfter' | 'durationSec' | 'completed'>>;

/**
 * Updates an already-logged SOS session in place (e.g. the urge re-rating made
 * on the completion screen after the session was saved).
 */
export function amendSosSession(id: string, patch: SosSessionPatch): void {
  useStore.getState().updateSosSession(id, patch);
}
