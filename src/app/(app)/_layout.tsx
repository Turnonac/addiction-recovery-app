import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Main app stack (only reachable after onboarding). Every screen draws its own
 * header via <Header />, so the native header is hidden. Modal-style routes are
 * declared here; everything else is a normal push.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="habit/[id]/index" />
      <Stack.Screen name="habit/[id]/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="habit/[id]/relapse" options={{ presentation: 'modal' }} />
      <Stack.Screen name="habit/[id]/history" />
      <Stack.Screen name="habit/[id]/health" />
      <Stack.Screen name="habit/[id]/brain" />
      <Stack.Screen name="sos/index" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="sos/[exercise]" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="journal/index" />
      <Stack.Screen name="journal/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="journal/[id]" />
      <Stack.Screen name="stats" options={{ presentation: 'modal' }} />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="certificate" options={{ presentation: 'modal' }} />
      <Stack.Screen name="milestone" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="weekly" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/archived" />
    </Stack>
  );
}
