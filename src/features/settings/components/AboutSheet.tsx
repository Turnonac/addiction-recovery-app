import { StyleSheet, View } from 'react-native';

import { Icon, QLogo, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { IconName } from '@/types';
import { appVersion } from '../appInfo';
import { SettingsSheet } from './SettingsSheet';

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'cellphone-lock', title: 'Private by design', text: 'No account, no servers. Everything is stored only on this device.' },
  { icon: 'medical-bag', title: 'Not medical advice', text: 'Health and recovery information is general and not a substitute for a doctor.' },
  { icon: 'tray-arrow-up', title: 'Your data, your call', text: 'Export a backup anytime from Settings → Data.' },
];

export function AboutSheet({ onClose }: { onClose: () => void }) {
  return (
    <SettingsSheet title="About Quit" onClose={onClose} testID="about-sheet">
      <View style={styles.hero}>
        <QLogo size={64} glow />
        <Text variant="heading" style={styles.name}>
          Quit
        </Text>
        <Text variant="caption" tone="tertiary" mono>
          Version {appVersion()}
        </Text>
        <Text variant="body" tone="secondary" center style={styles.lead}>
          Quit is an offline, private habit tracker. Health information is general and not medical advice.
        </Text>
      </View>
      <View style={styles.points}>
        {POINTS.map((p) => (
          <View key={p.title} style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon name={p.icon} size={18} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text variant="captionStrong">{p.title}</Text>
              <Text variant="caption" tone="secondary">
                {p.text}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="caption" tone="tertiary" center style={styles.credit}>
        Inspired by Quit: Habit Tracker.
      </Text>
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.lg },
  name: { marginTop: spacing.md },
  lead: { marginTop: spacing.md, lineHeight: 21, paddingHorizontal: spacing.md },
  points: {
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pointIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  credit: { marginTop: spacing.lg },
});
