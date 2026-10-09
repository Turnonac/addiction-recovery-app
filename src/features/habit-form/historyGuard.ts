/**
 * Browser Back for forms with unsaved changes (web).
 *
 * React Navigation's web linking turns the browser's Back/Forward into a state
 * reset, which skips `beforeRemove` — so `usePreventRemove` never gets a say.
 * While the guard is active it keeps a copy of the current history entry on
 * top. Back then pops that copy instead of the screen (the app's own popstate
 * listeners never see it) and `onBack` decides: leave (we step back once more,
 * this time for real) or stay (the copy goes back on top).
 *
 * Before navigating on purpose (save, close, delete…) call `release`: it takes
 * the copy off first, so the app's history bookkeeping stays exact.
 *
 * No DOM types here: the environment is passed in, which keeps this testable.
 */

/** Marks our duplicate entry's `history.state`. */
export const GUARD_MARK = '__quitFormGuard';

/** How long to wait for the `popstate` after our own `history.back()`. */
const SETTLE_MS = 500;

export interface GuardPopState {
  readonly state: unknown;
  stopImmediatePropagation(): void;
}

export interface GuardEnv {
  history: {
    readonly state: unknown;
    pushState(data: unknown, unused: string, url?: string | null): void;
    back(): void;
  };
  location: { readonly href: string };
  /** Listen to `popstate` ahead of the app's own listeners (capture phase); returns the unsubscribe. */
  listen(listener: (event: GuardPopState) => void): () => void;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface HistoryGuard {
  /** Keep the extra entry while true (the form has unsaved changes). */
  setActive(active: boolean): void;
  /** Leaving on purpose: take the extra entry off, then run `then` (right away when there is none). */
  release(then: () => void): void;
  /** The form is gone: drop the extra entry and stop listening. */
  dispose(): void;
}

function field(state: unknown, key: string): unknown {
  return state != null && typeof state === 'object' ? (state as Record<string, unknown>)[key] : undefined;
}

/**
 * @param onBack Called when the browser's Back was absorbed. Resolve `true` to
 * leave (the guard then goes back for real), `false` to stay.
 */
export function createHistoryGuard(env: GuardEnv, onBack: () => Promise<boolean>): HistoryGuard {
  let active = false;
  /** Leaving on purpose: never add the entry again. */
  let released = false;
  let disposed = false;
  /** `onBack` is deciding; hold everything until it answers. */
  let asking = false;
  /** Our entry while it is in the history: the id and URL of the entry it copies. */
  let entry: { id: unknown; href: string } | null = null;
  /** Our own `history.back()` is on its way. */
  let removing = false;
  let timer: unknown = null;
  let waiters: (() => void)[] = [];
  let unlisten: (() => void) | null = null;

  const stopIfDone = () => {
    if (disposed && !entry && !removing && !asking && unlisten) {
      unlisten();
      unlisten = null;
    }
  };

  const removed = () => {
    entry = null;
    removing = false;
    if (timer != null) env.clearTimeout(timer);
    timer = null;
    const run = waiters;
    waiters = [];
    for (const fn of run) fn();
    sync();
    stopIfDone();
  };

  const onPop = (event: GuardPopState) => {
    if (!entry) return;
    // Landed on our entry again (Back from a screen above the form): not leaving.
    if (field(event.state, GUARD_MARK) === true) return;
    if (removing) {
      event.stopImmediatePropagation();
      removed();
      return;
    }
    if (field(event.state, 'id') !== entry.id) {
      // Jumped past the form (e.g. the browser's history menu): let the app follow.
      entry = null;
      return;
    }
    // Back was pressed and our entry absorbed it: the form is still on screen.
    event.stopImmediatePropagation();
    entry = null;
    asking = true;
    void onBack().then(
      (leave) => {
        asking = false;
        if (leave && !disposed) {
          released = true;
          env.history.back();
        }
        sync();
        stopIfDone();
      },
      () => {
        asking = false;
        sync();
        stopIfDone();
      },
    );
  };

  function sync() {
    if (asking || removing) return;
    const want = active && !released && !disposed;
    if (want && !entry) {
      if (!unlisten) unlisten = env.listen(onPop);
      const state = env.history.state;
      const copy = state != null && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {};
      entry = { id: field(state, 'id'), href: env.location.href };
      env.history.pushState({ ...copy, [GUARD_MARK]: true }, '', entry.href);
    } else if (!want && entry) {
      if (field(env.history.state, GUARD_MARK) !== true || env.location.href !== entry.href) {
        // Something else already moved the history (our entry was replaced): leave it be.
        removed();
        return;
      }
      removing = true;
      env.history.back();
      // `popstate` normally follows within a frame; never wait forever.
      timer = env.setTimeout(removed, SETTLE_MS);
    }
  }

  return {
    setActive(next) {
      active = next;
      sync();
    },
    release(then) {
      released = true;
      if (!entry) {
        then();
        return;
      }
      waiters.push(then);
      sync();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      sync();
      stopIfDone();
    },
  };
}
