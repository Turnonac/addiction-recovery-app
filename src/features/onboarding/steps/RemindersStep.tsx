import { StyleSheet, View } from 'react-native';

import { Card, IconTile, ListGroup, ListRow, SectionHeader, Text } from '@/components';
import { colors, habitColors, spacing } from '@/theme';
import type { IconName } from '@/types';
import { pad2 } from '@/utils/format';
import { StepLayout } from '../OnboardingChrome';

const PRIVACY_POINTS: { icon: IconName; text: string }[] = [
  { icon: 'account-off-outline', text: 'No sign-up, no account' },
  { icon: 'wifi-off', text: 'Works fully offline' },
  { icon: 'export-variant', text: 'Export or erase your data any time in Settings' },
];

export interface RemindersStepProps {
  reminder: boolean;
  reminderTime: { hour: number; minute: number };
  onReminderChange: (enabled: boolean) => void;
  onNext: () => void;
}

export function RemindersStep({ reminder, reminderTime, onReminderChange, onNext }: RemindersStepProps) {
  const time = `${pad2(reminderTime.hour)}:${pad2(reminderTime.minute)}`;
  return (
    <StepLayout
      title="Reminders & privacy"
      subtitle="A short daily check-in keeps you honest with yourself."
      footer={{ label: 'Continue', onPress: onNext, iconRight: 'arrow-right', testID: 'onboarding-reminders-next' }}
    >
      <ListGroup>
        <ListRow
          title="Daily check-in reminder"
          subtitle={reminder ? `Every day at ${time} · change it in Settings` : 'A gentle nudge once a day'}
          icon="bell-ring-outline"
          iconColor={colors.accent}
          toggle={reminder}
          onToggle={onReminderChange}
          testID="onboarding-reminder-toggle"
        />
      </ListGroup>

      <SectionHeader title="Privacy" icon="shield-lock-outline" />
      <Card tint={colors.success} tintStrength={0.06}>
        <View style={styles.privacyHead}>
          <IconTile icon="shield-lock-outline" color={colors.success} size={48} />
          <Text variant="subheading" style={styles.flex}>
            Your data never leaves this device. No account needed.
          </Text>
        </View>
        <View style={styles.points}>
          {PRIVACY_POINTS.map((p) => (
            <View key={p.text} style={styles.point}>
              <IconTile icon={p.icon} color={habitColors.slate} size={28} />
              <Text variant="caption" tone="secondary" style={styles.flex}>
                {p.text}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  privacyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  points: { marginTop: spacing.lg, gap: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
