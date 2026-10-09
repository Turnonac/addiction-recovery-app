import { router } from 'expo-router';

/**
 * Leave to Home: pop back to it when it is in the stack (the usual case), so the
 * back gesture doesn't lead into a screen whose habit is gone; otherwise replace.
 */
export function goHome(): void {
  if (router.canDismiss()) router.dismissTo('/');
  else router.replace('/');
}

/** Close a modal / pushed screen, falling back to `fallback` when opened directly. */
export function closeOr(fallback: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
