import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { IconTile, QLogo, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { IconName } from '@/types';
import { StepLayout } from '../OnboardingChrome';

const BENEFITS: { icon: IconName; color: string; title: string; body: string }[] = [
  { icon: 'timer-outline', color: colors.fire, title: 'Every second counts', body: 'Track days, hours and milestones' },
  { icon: 'lifebuoy', color: colors.danger, title: 'SOS tools for when cravings hit', body: 'Guided breathing and grounding in seconds' },
  { icon: 'shield-lock-outline', color: colors.success, title: 'Private', body: 'Everything stays on your device' },
];

/** Hand-drawn loop around a word, like the App Store artwork. */
function Scribble() {
  return (
    <View style={styles.scribble} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 200 80" preserveAspectRatio="none">
        <Path
          d="M150 8 C 95 -2, 22 6, 8 34 C -4 60, 62 76, 118 72 C 170 68, 198 50, 192 28 C 186 10, 140 4, 96 8"
          stroke={colors.accent}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <StepLayout centered footer={{ label: 'Get started', onPress: onNext, iconRight: 'arrow-right', testID: 'onboarding-get-started' }}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.logo}>
        <QLogo size={84} glow />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)} accessible accessibilityRole="header" accessibilityLabel="Break free from bad habits">
        <View style={styles.line}>
          <View>
            <Scribble />
            <Text variant="display">Break</Text>
          </View>
          <Text variant="display"> free from</Text>
        </View>
        <Text variant="display" center>
          bad habits
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).duration(500)}>
        <Text variant="heading" tone="secondary" center style={styles.tagline}>
          Track progress. Rebuild control.
        </Text>
      </Animated.View>

      <View style={styles.benefits}>
        {BENEFITS.map((b, i) => (
          <Animated.View key={b.title} entering={FadeInDown.delay(320 + i * 90).duration(450)} style={styles.benefit}>
            <IconTile icon={b.icon} color={b.color} size={44} />
            <View style={styles.benefitText}>
              <Text variant="bodyStrong">{b.title}</Text>
              <Text variant="caption" tone="secondary">
                {b.body}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center', marginBottom: spacing.xxxl },
  line: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  scribble: { position: 'absolute', left: -14, right: -12, top: -4, bottom: -6 },
  tagline: { marginTop: spacing.lg },
  benefits: { marginTop: spacing.xxxl, gap: spacing.md },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  benefitText: { flex: 1, gap: 2 },
});
