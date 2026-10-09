import { useStore } from '@/store';
import type { SosSession } from '@/types';

export type SosSessionPatch = Partial<Pick<SosSession, 'intensityAfter' | 'durationSec' | 'completed'>>;

/**
 * Updates an already-logged SOS session in place (e.g. the urge re-rating made
 * on the completion screen after the session was saved).
 *
 * The store has no `updateSosSession` action yet (requested as a shared change),
 * so this is a narrow state update of that single record.
 */
export function amendSosSession(id: string, patch: SosSessionPatch): void {
  useStore.setState((s) => ({
    sosSessions: s.sosSessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  }));
}
