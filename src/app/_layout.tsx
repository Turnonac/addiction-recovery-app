import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { exposeDevTools } from '@/dev/exposeDevTools';
import { AchievementWatcher } from '@/features/achievements/AchievementWatcher';
import { MilestoneWatcher } from '@/features/celebrations/MilestoneWatcher';
import { AppLockGate } from '@/features/lock/AppLockGate';
import { NotificationsSync } from '@/features/notifications/NotificationsSync';
import { useStore } from '@/store';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();
exposeDevTools();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  const hydrated = useStore((s) => s.hasHydrated);
  const onboarded = useStore((s) => s.settings.onboardingCompleted);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  // Keep the splash screen up until persisted state is loaded.
  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <AppLockGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Protected guard={onboarded}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={!onboarded}>
                <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              </Stack.Protected>
            </Stack>
            {onboarded ? (
              <>
                <MilestoneWatcher />
                <AchievementWatcher />
                <NotificationsSync />
              </>
            ) : null}
          </AppLockGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
