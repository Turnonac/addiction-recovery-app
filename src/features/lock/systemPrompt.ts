/**
 * Tracks whether a system prompt (Face ID / passcode, notification permission
 * alert…) is on screen. Such prompts make iOS report the app as `inactive` and
 * may send Android through `background` → `active` (device-credential screen);
 * the lock gate must not treat that as "leaving the app".
 */

/** The app turns `active` again a moment after a prompt closes. */
const TAIL_MS = 600;

let open = 0;

export function isSystemPromptActive(): boolean {
  return open > 0;
}

export function beginSystemPrompt(): void {
  open += 1;
}

export function endSystemPrompt(): void {
  setTimeout(() => {
    open = Math.max(0, open - 1);
  }, TAIL_MS);
}

/** Run `fn` (which shows a system prompt) with the marker set. */
export async function withSystemPrompt<T>(fn: () => Promise<T>): Promise<T> {
  beginSystemPrompt();
  try {
    return await fn();
  } finally {
    endSystemPrompt();
  }
}
