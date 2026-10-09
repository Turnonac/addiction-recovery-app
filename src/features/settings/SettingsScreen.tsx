import { StyleSheet, View } from 'react-native';

import { Header, Screen, SectionHeader } from '@/components';
import { useActiveHabits } from '@/store/selectors';
import { colors, spacing } from '@/theme';
import { DataSection } from './components/DataSection';
import { HabitsSection } from './components/HabitsSection';
import { NotificationsSection } from './components/NotificationsSection';
import { PreferencesSection } from './components/PreferencesSection';
import { ProfileCard } from './components/ProfileCard';
import { SecuritySection } from './components/SecuritySection';
import { SettingsFooter } from './components/SettingsFooter';
import { SupportSection } from './components/SupportSection';

export function SettingsScreen() {
  const habits = useActiveHabits();
  return (
    <Screen header={<Header title="Settings" large />} glowColor={colors.accent} glowIntensity={0.28} testID="settings-screen">
      <View style={styles.top}>
        <SectionHeader title="Profile" icon="account-outline" />
      </View>
      <ProfileCard habitCount={habits.length} />
      <HabitsSection />
      <PreferencesSection />
      <NotificationsSection />
      <SecuritySection />
      <DataSection />
      <SupportSection />
      <SettingsFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The large header already provides spacing above the first section.
  top: { marginTop: -spacing.lg },
});
