import { Tabs } from 'expo-router/js-tabs';

import { TabIcon } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

/**
 * Three JS tabs: Today, History, Settings (a nested stack). SDK 58 shows only
 * declared screens, so every tab is listed here. The focused tab draws the
 * soft accent pill behind its icon (TabIcon), as in the mockups.
 */
export default function TabsLayout() {
  const theme = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.line,
          borderTopWidth: 1,
        },
        // Room for TabIcon's 56x30 pill (the default icon box is 31x28).
        tabBarIconStyle: { width: 56, height: 30 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarAccessibilityLabel: 'Today',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="today" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarAccessibilityLabel: 'History',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="history" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="settings" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
