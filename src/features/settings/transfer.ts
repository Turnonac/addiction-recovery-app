/**
 * Web implementation of backup file I/O (native: transfer.native.ts).
 * Only touches `document` inside the functions, so importing is always safe.
 */

export type SaveResult = { status: 'saved'; detail: string } | { status: 'cancelled' };

/** Trigger a download of the backup JSON. */
export async function saveBackupFile(fileName: string, json: string): Promise<SaveResult> {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { status: 'saved', detail: `Downloaded ${fileName}` };
}

export interface PickOptions {
  /**
   * Web only: a file chosen after the pick already resolved `null` (the
   * no-`cancel`-event fallback gave up too early, e.g. a slow cloud file).
   */
  onLateFile?: (text: string) => void;
  /** Web only: reading such a late file failed. */
  onLateError?: (error: unknown) => void;
}

/** Hidden input of a pick that resolved without a file but may still get one. */
let lingering: HTMLInputElement | null = null;

/** How long after the window regains focus a pick without a file counts as cancelled. */
const FOCUS_FALLBACK_MS = 1500;

/**
 * Let the user pick a .json file. Resolves its text, or null when cancelled.
 *
 * Browsers without the input `cancel` event (Safari < 16.4, some webviews) never
 * say the dialog was dismissed. Fallback: once the window has blurred (dialog
 * open) and regained focus, a pick still without a file after a grace period
 * resolves `null` so the UI isn't stuck busy. The `change` listener stays
 * attached, so a file that arrives later still goes to `onLateFile`.
 */
export function pickBackupFile(options: PickOptions = {}): Promise<string | null> {
  lingering?.remove();
  lingering = null;
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    let settled = false;
    let blurred = false;
    let focusTimer: ReturnType<typeof setTimeout> | undefined;

    const detachWindow = () => {
      clearTimeout(focusTimer);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
    const dispose = () => {
      detachWindow();
      input.remove();
      if (lingering === input) lingering = null;
    };
    /** Settle the promise once; returns false when it already was. */
    const settle = (value: string | null, error?: unknown): boolean => {
      if (settled) return false;
      settled = true;
      detachWindow();
      if (error) reject(error);
      else resolve(value);
      return true;
    };
    const onBlur = () => {
      blurred = true;
    };
    const onFocus = () => {
      if (!blurred) return;
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        if (input.files?.length || !settle(null)) return;
        // Keep the input (and its `change` listener) for a late selection.
        lingering = input;
      }, FOCUS_FALLBACK_MS);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        settle(null);
        dispose();
        return;
      }
      file.text().then(
        (text) => {
          if (!settle(text)) options.onLateFile?.(text);
          dispose();
        },
        (e: unknown) => {
          if (!settle(null, e)) options.onLateError?.(e);
          dispose();
        },
      );
    });
    input.addEventListener('cancel', () => {
      settle(null);
      dispose();
    });
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.body.appendChild(input);
    input.click();
  });
}
