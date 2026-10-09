import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, QLogo, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { IconName } from '@/types';

interface HeaderAction {
  icon: IconName;
  label: string;
  href: string;
}

const ACTIONS: HeaderAction[] = [
  { icon: 'medal-outline', label: 'Achievements', href: '/achievements' },
  { icon: 'chart-box-outline', label: 'Statistics', href: '/stats' },
  { icon: 'cog-outline', label: 'Settings', href: '/settings' },
];

/** "Q Quit" wordmark on the left, a single glass pill with shortcuts on the right. */
export function HomeHeader() {
  return (
    <View style={styles.wrap}>
      <View style={styles.brand}>
        <QLogo size={32} />
        <Text variant="heading" style={styles.title} accessibilityRole="header">
          Quit
        </Text>
      </View>
      <View style={styles.pill}>
        {ACTIONS.map((a, i) => (
          <Fragment key={a.href}>
            {i > 0 && <View style={styles.divider} />}
            <Pressable
              onPress={() => router.push(a.href)}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              hitSlop={4}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Icon name={a.icon} size={19} color={colors.text} />
            </Pressable>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  title: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.cardStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  action: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  pressed: { backgroundColor: colors.cardPressed },
  divider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: colors.borderStrong },
});
