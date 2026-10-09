import { router } from 'expo-router';

import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import type { JournalEntry } from '@/types';
import { confirm } from '@/utils/confirm';

/** Back when there is a screen to go back to; otherwise (deep link) replace with `href`, not Home. */
export function backOr(href: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(href);
}

/** Confirm + delete. Resolves true when the entry was deleted. */
export function useDeleteEntry() {
  const deleteJournalEntry = useStore((s) => s.deleteJournalEntry);
  const haptic = useHaptics();
  return async (entry: JournalEntry, beforeDelete?: () => void): Promise<boolean> => {
    haptic('warning');
    const ok = await confirm({
      title: 'Delete entry?',
      message: `“${entry.title || 'Untitled'}” will be permanently deleted from this device.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!ok) return false;
    beforeDelete?.();
    deleteJournalEntry(entry.id);
    haptic('success');
    return true;
  };
}

/** Moves an entry to a different date/time (also bumps `updatedAt`). */
export function setEntryCreatedAt(id: string, createdAt: number): void {
  useStore.getState().updateJournalEntry(id, { createdAt });
}
