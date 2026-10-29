import { Stack, ThemeProvider, useRouter, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { openAppDatabase } from '@/data/database';
import { createSqliteRepository } from '@/data/repository';
import {
  addReminderTapListener,
  configureForegroundHandler,
  reconcileReminder,
} from '@/services/notifications';
import { enablePrivacyCover } from '@/services/privacy';
import { useAppStore } from '@/state/store';
import { Button } from '@/ui/components';
import { useAppTheme, type AppTheme } from '@/ui/theme';

// Keep the native splash up until the database is loaded (called at module
// scope, not awaited, per the expo-splash-screen docs).
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden or unavailable (tests / web): nothing to keep up.
});

/**
 * Deep links straight to a modal (/check-in, /call, /day/…) keep the tabs
 * underneath, so closing the modal lands on Today instead of an empty stack.
 */
export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Wait this long after the app becomes active before reconciling the reminder,
 * so a screen that just asked for notification permission (which backgrounds
 * the app on Android) can save its new reminder setting first.
 */
const RECONCILE_DELAY_MS = 1500;

// Opened once per JS runtime (survives remounts and Fast Refresh); reset on failure so "Try again" retries.
let databasePromise: Promise<SQLiteDatabase> | null = null;

function getDatabase(): Promise<SQLiteDatabase> {
  if (databasePromise === null) {
    const opening = openAppDatabase();
    databasePromise = opening;
    opening.catch(() => {
      if (databasePromise === opening) databasePromise = null;
    });
  }
  return databasePromise;
}

let startupPromise: Promise<void> | null = null;

/** Open the database and load the store, once. */
function startApp(): Promise<void> {
  if (useAppStore.getState().ready) return Promise.resolve();
  if (startupPromise === null) {
    const starting = (async () => {
      const db = await getDatabase();
      await useAppStore.getState().init(createSqliteRepository(db));
    })();
    startupPromise = starting;
    // Settled either way: later calls go by `ready` (or retry after a failure).
    starting
      .catch(() => undefined)
      .finally(() => {
        if (startupPromise === starting) startupPromise = null;
      });
  }
  return startupPromise;
}

function hideSplash(): void {
  try {
    SplashScreen.hide();
  } catch {
    // No native splash (tests / web).
  }
}

/** Milliseconds until just after the next local midnight (DST-safe: built from local fields). */
function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

/** React Navigation theme from our tokens, so screen backgrounds never flash white. */
function navigationTheme(theme: AppTheme): Theme {
  return {
    dark: theme.scheme === 'dark',
    colors: {
      primary: theme.accent,
      background: theme.bg,
      card: theme.surface,
      text: theme.text,
      border: theme.line,
      notification: theme.levels[3].solid,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '600' },
      heavy: { fontFamily: 'System', fontWeight: '700' },
    },
  };
}

export default function RootLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const ready = useAppStore((s) => s.ready);
  const onboardingDone = useAppStore((s) => s.settings.onboardingDone);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Open the database and load the store.
  useEffect(() => {
    let active = true;
    startApp().catch((error: unknown) => {
      console.warn('WalkInLight: could not open app data', error);
      if (active) setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  // Hide the splash once there is something to show (the app, or the error message).
  useEffect(() => {
    if (ready || failed) hideSplash();
  }, [ready, failed]);

  // App-switcher cover and "no banner while the app is open", once.
  useEffect(() => {
    try {
      configureForegroundHandler();
    } catch {
      // Notifications unavailable on this platform.
    }
    void enablePrivacyCover();
  }, []);

  // Reminder tap (also the tap that cold-started the app) opens today's check-in.
  // The explicit date matters when a check-in for another day is already open:
  // that screen is reused, and its params are replaced by these.
  useEffect(() => {
    if (!ready || !onboardingDone) return undefined;
    return addReminderTapListener(() => {
      try {
        useAppStore.getState().refreshToday();
        router.navigate({ pathname: '/check-in', params: { date: useAppStore.getState().today } });
      } catch (error) {
        console.warn('WalkInLight: could not open the check-in', error);
      }
    });
  }, [ready, onboardingDone, router]);

  // Back in the foreground: recompute today, re-apply the privacy cover (Android sets
  // it per window, and a recreated Activity has a new one) and make the OS reminder
  // match settings.
  useEffect(() => {
    if (!ready) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // currentState can be null before the first native value arrives.
    let last: string | null | undefined = AppState.currentState;

    const reconcileSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { settings } = useAppStore.getState();
        // Onboarding schedules its own reminder; reconciling mid-flow could race with it.
        if (settings.onboardingDone) void reconcileReminder(settings.reminder);
      }, RECONCILE_DELAY_MS);
    };

    reconcileSoon(); // launch
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && last !== 'active') {
        useAppStore.getState().refreshToday();
        void enablePrivacyCover();
        reconcileSoon();
      } else if (next !== 'active') {
        clearTimeout(timer);
      }
      last = next;
    });
    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [ready]);

  // Day boundary = local midnight. Re-arms itself; an early or late fire only re-checks.
  useEffect(() => {
    if (!ready) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      timer = setTimeout(() => {
        useAppStore.getState().refreshToday();
        arm();
      }, msUntilNextMidnight());
    };
    arm();
    return () => clearTimeout(timer);
  }, [ready]);

  const statusBarStyle = theme.scheme === 'dark' ? 'light' : 'dark';

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar style={statusBarStyle} />
        {failed ? (
          <StartupError
            onRetry={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <ThemeProvider value={navigationTheme(theme)}>
      <StatusBar style={statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Protected guard={onboardingDone} redirectTo="/onboarding">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="call" options={{ presentation: 'modal' }} />
          <Stack.Screen name="day/[date]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!onboardingDone} redirectTo="/">
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

function StartupError({ onRetry }: { onRetry: () => void }) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{ flex: 1, justifyContent: 'center', gap: 16, paddingHorizontal: 24 }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: theme.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }}
      >
        Couldn’t open your data
      </Text>
      <Text style={{ color: theme.muted, fontSize: 16, lineHeight: 22, textAlign: 'center' }}>
        Nothing was deleted. Try again, or close WalkInLight and open it again.
      </Text>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}
