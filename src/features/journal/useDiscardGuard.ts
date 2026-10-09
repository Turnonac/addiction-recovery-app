import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { confirm, type ConfirmOptions } from '@/utils/confirm';

function discardOptions(isEdit: boolean): ConfirmOptions {
  return {
    title: isEdit ? 'Discard changes?' : 'Discard this entry?',
    message: isEdit ? 'Your edits to this entry will be lost.' : 'What you wrote hasn’t been saved yet.',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep writing',
    destructive: true,
  };
}

/** Marks our duplicate history entry (kept next to expo-router's own `id`). */
const GUARD_KEY = '__journalDiscardGuard';

/** Duplicates the current browser history entry: same URL, same expo-router entry id, plus our mark. */
function pushGuardEntry(): void {
  const state: unknown = window.history.state;
  const base = state && typeof state === 'object' ? state : {};
  window.history.pushState({ ...base, [GUARD_KEY]: true }, '', window.location.href);
}

function onGuardEntry(): boolean {
  const state: unknown = window.history.state;
  return !!state && typeof state === 'object' && (state as Record<string, unknown>)[GUARD_KEY] === true;
}

export interface DiscardGuardOptions {
  /** True while there are unsaved changes worth asking about. */
  active: boolean;
  isEdit: boolean;
  /** Where to go when the user discards via browser Back and there is no screen to go back to. */
  fallbackHref: string;
}

export interface DiscardGuard {
  /** Call before leaving on purpose (e.g. after saving). Resolves once it's safe to navigate. */
  release: () => Promise<void>;
}

/**
 * Asks "Discard?" before an unsaved editor goes away.
 *
 * - Close button, swipe-down and Android back go through `beforeRemove` (usePreventRemove).
 * - Web browser Back: expo-router answers `popstate` with `resetRoot`, which skips `beforeRemove`
 *   and unmounts the editor before any later listener runs. So while the draft is dirty we keep a
 *   marked duplicate of the editor's history entry on top. Back only steps off that duplicate
 *   (the app stays on the editor), we ask, then either leave for real or put the duplicate back.
 * - Web reload / closing the tab: the browser's own `beforeunload` prompt.
 */
export function useDiscardGuard({ active, isEdit, fallbackHref }: DiscardGuardOptions): DiscardGuard {
  const navigation = useNavigation();
  // The user agreed to leave: let the next removal through without asking again.
  const leaving = useRef(false);
  // We pushed a duplicate history entry and haven't seen it go away yet (web).
  const guardEntry = useRef(false);
  // The next popstate is ours (removing the duplicate), not the user pressing Back.
  const selfPop = useRef(false);
  const mounted = useRef(true);

  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  /** Browser Back just stepped off our duplicate: the URL is the editor's again. */
  const steppedOff = () => isWeb && guardEntry.current && !onGuardEntry();

  const askAfterBrowserBack = () => {
    guardEntry.current = false;
    void confirm(discardOptions(isEdit)).then((ok) => {
      if (ok) {
        leaving.current = true;
        if (router.canGoBack()) router.back();
        else router.replace(fallbackHref);
      } else {
        pushGuardEntry();
        guardEntry.current = true;
      }
    });
  };

  const release = (): Promise<void> => {
    if (!isWeb || !guardEntry.current) return Promise.resolve();
    guardEntry.current = false;
    if (!onGuardEntry()) return Promise.resolve();
    selfPop.current = true;
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        window.removeEventListener('popstate', done);
        selfPop.current = false;
        resolve();
      };
      // history.back() is async and has no completion callback besides popstate.
      const timer = setTimeout(done, 300);
      window.addEventListener('popstate', done);
      window.history.back();
    });
  };

  usePreventRemove(active, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    // expo-router reacting to our own history.back() in release(): we navigate ourselves next.
    if (selfPop.current) return;
    // expo-router reacting to a browser Back (a deep-linked editor gets a RESET): ask, and on
    // "Discard" leave properly instead of replaying expo-router's reaction.
    if (steppedOff()) {
      askAfterBrowserBack();
      return;
    }
    void confirm(discardOptions(isEdit)).then(async (ok) => {
      if (!ok) return;
      await release();
      leaving.current = true;
      navigation.dispatch(data.action);
    });
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') return;

    if (!guardEntry.current) {
      pushGuardEntry();
      guardEntry.current = true;
    }

    const onPopState = () => {
      if (selfPop.current || leaving.current) return;
      if (steppedOff()) askAfterBrowserBack();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers only prompt when returnValue is set.
      e.returnValue = '';
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
      // Draft became clean again while the editor stays open: drop the duplicate so Back
      // isn't swallowed. On unmount, leave history alone (a navigation is in flight).
      if (guardEntry.current && !leaving.current) {
        setTimeout(() => {
          if (mounted.current) void release();
        }, 0);
      }
    };
    // The helpers only read refs plus isEdit/fallbackHref. Re-running on their identity would
    // pop and re-push the duplicate history entry on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isEdit, fallbackHref]);

  return { release };
}
