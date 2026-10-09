import { createHistoryGuard, GUARD_MARK, type GuardEnv, type GuardPopState } from '../historyGuard';

/** A tiny browser history: entries, async popstate, a guard listener (capture) and the app's listener. */
function fakeBrowser(initial: { href: string; state: unknown }[]) {
  const entries = initial.map((e) => ({ ...e }));
  let index = entries.length - 1;
  const queue: (() => void)[] = [];
  let guardListener: ((e: GuardPopState) => void) | null = null;
  const appSaw: unknown[] = [];
  const timers: { fn: () => void; cleared: boolean }[] = [];

  const firePop = () => {
    let stopped = false;
    const event: GuardPopState = {
      state: entries[index].state,
      stopImmediatePropagation: () => {
        stopped = true;
      },
    };
    guardListener?.(event);
    if (!stopped) appSaw.push(entries[index].state);
  };

  const env: GuardEnv = {
    history: {
      get state() {
        return entries[index].state;
      },
      pushState(data, _unused, url) {
        entries.splice(index + 1);
        entries.push({ href: url ?? entries[index].href, state: data });
        index = entries.length - 1;
      },
      back() {
        queue.push(() => {
          if (index === 0) return;
          index -= 1;
          firePop();
        });
      },
    },
    location: {
      get href() {
        return entries[index].href;
      },
    },
    listen(listener) {
      guardListener = listener;
      return () => {
        guardListener = null;
      };
    },
    setTimeout(fn) {
      const t = { fn, cleared: false };
      timers.push(t);
      return t;
    },
    clearTimeout(handle) {
      (handle as { cleared: boolean }).cleared = true;
    },
  };

  return {
    env,
    entries,
    get index() {
      return index;
    },
    get listening() {
      return guardListener != null;
    },
    appSaw,
    /** Run pending history traversals (each fires its popstate). */
    flush() {
      while (queue.length) queue.shift()!();
    },
    /** The user presses the browser's Back. */
    userBack() {
      env.history.back();
      this.flush();
    },
    /** Like the router replacing the current entry. */
    replaceCurrent(href: string, state: unknown) {
      entries[index] = { href, state };
    },
    runTimers() {
      for (const t of timers.splice(0)) if (!t.cleared) t.fn();
    },
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

const start = () =>
  fakeBrowser([
    { href: 'http://x/', state: { id: 'home' } },
    { href: 'http://x/habit/new', state: { id: 'form' } },
  ]);

describe('createHistoryGuard', () => {
  it('adds nothing while inactive and lets Back through', () => {
    const b = start();
    const onBack = jest.fn(async () => true);
    createHistoryGuard(b.env, onBack).setActive(false);
    expect(b.entries).toHaveLength(2);
    b.userBack();
    expect(onBack).not.toHaveBeenCalled();
    expect(b.appSaw).toEqual([{ id: 'home' }]);
  });

  it('pushes one marked copy of the current entry when activated', () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    g.setActive(true);
    g.setActive(true);
    expect(b.entries).toHaveLength(3);
    expect(b.entries[2]).toEqual({ href: 'http://x/habit/new', state: { id: 'form', [GUARD_MARK]: true } });
  });

  it('absorbs Back and stays when onBack says no, re-arming the copy', async () => {
    const b = start();
    const onBack = jest.fn(async () => false);
    const g = createHistoryGuard(b.env, onBack);
    g.setActive(true);
    b.userBack();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(b.appSaw).toEqual([]);
    await settle();
    expect(b.entries).toHaveLength(3);
    expect(b.index).toBe(2);
    // A second Back asks again.
    b.userBack();
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('absorbs Back, then goes back for real when onBack says yes', async () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    g.setActive(true);
    b.userBack();
    await settle();
    b.flush();
    expect(b.index).toBe(0);
    // The app only saw the real step back, not the absorbed one.
    expect(b.appSaw).toEqual([{ id: 'home' }]);
    // Leaving for good: nothing is pushed again.
    g.setActive(true);
    expect(b.entries[b.index]).toEqual({ href: 'http://x/', state: { id: 'home' } });
  });

  it('removes the copy silently when deactivated (edits reverted)', () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    g.setActive(true);
    g.setActive(false);
    b.flush();
    expect(b.index).toBe(1);
    expect(b.appSaw).toEqual([]);
    // And can arm again.
    g.setActive(true);
    expect(b.index).toBe(2);
  });

  it('release waits for the copy to come off before running the navigation', () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    g.setActive(true);
    const nav = jest.fn(() => {
      expect(b.index).toBe(1);
    });
    g.release(nav);
    expect(nav).not.toHaveBeenCalled();
    b.flush();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(b.appSaw).toEqual([]);
    // Released: never armed again.
    g.setActive(false);
    g.setActive(true);
    expect(b.entries).toHaveLength(3);
    expect(b.index).toBe(1);
  });

  it('release runs right away when there is no copy', () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    const nav = jest.fn();
    g.release(nav);
    expect(nav).toHaveBeenCalledTimes(1);
  });

  it('falls back to a timeout when the popstate never comes', () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    g.setActive(true);
    const nav = jest.fn();
    g.release(nav);
    b.runTimers();
    expect(nav).toHaveBeenCalledTimes(1);
  });

  it('lets popstates onto its own copy through (Back from a screen above the form)', () => {
    const b = start();
    const onBack = jest.fn(async () => true);
    const g = createHistoryGuard(b.env, onBack);
    g.setActive(true);
    b.env.history.pushState({ id: 'above' }, '', 'http://x/milestone');
    b.userBack();
    expect(onBack).not.toHaveBeenCalled();
    expect(b.appSaw).toEqual([{ id: 'form', [GUARD_MARK]: true }]);
  });

  it('does not step back on dispose when the router already replaced the copy', () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    g.setActive(true);
    b.replaceCurrent('http://x/habit/abc', { id: 'form' });
    g.dispose();
    b.flush();
    expect(b.index).toBe(2);
    expect(b.listening).toBe(false);
  });

  it('dispose takes the copy off and stops listening', () => {
    const b = start();
    const g = createHistoryGuard(b.env, async () => true);
    g.setActive(true);
    expect(b.listening).toBe(true);
    g.dispose();
    b.flush();
    expect(b.index).toBe(1);
    expect(b.appSaw).toEqual([]);
    expect(b.listening).toBe(false);
  });
});
