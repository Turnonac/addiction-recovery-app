import { Stack } from 'expo-router';

import { useAppTheme } from '@/ui/theme';

// Deep links (e.g. Today's "Add your partner" → /settings/partner) keep
// Settings underneath, so the in-screen "‹ Settings" back link has a target.
export const unstable_settings = {
  anchor: 'index',
};

/** Settings tab stack. Screens draw their own "‹ Settings" back link (mockups), so no native header. */
export default function SettingsLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    />
  );
}
