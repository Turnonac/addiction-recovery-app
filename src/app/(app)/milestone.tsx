import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text } from '@/components';
import { fitFontSize } from '@/features/achievements/certificateLogic';
import { shareText } from '@/features/achievements/share';
import { CelebrationCard } from '@/features/celebrations/CelebrationCard';
import { Confetti } from '@/features/celebrations/Confetti';
import { MilestoneBadge } from '@/features/celebrations/MilestoneBadge';
import { hashSeed } from '@/features/celebrations/confetti';
import { hasCertificate, milestoneMessage, milestoneShareText, milestoneTitle } from '@/features/celebrations/milestoneCopy';
import { isMilestoneReached } from '@/features/celebrations/milestoneLogic';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useHabit } from '@/store/selectors';
import { colors, spacing, withAlpha } from '@/theme';

const TITLE_SIZE = 26;
const TITLE_MIN_SIZE = 19;
const TITLE_LINES = 3;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function MilestoneScreen() {
  const params = useLocalSearchParams<{ habitId?: string; days?: string }>();
  const habit = useHabit(params.habitId);
  const days = Number(params.days);
  const now = useNow(60_000);
  // Only a milestone the current streak has really reached (not any deep-linked number).
  const valid = isMilestoneReached(habit, days, now);
  const haptic = useHaptics();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (valid) haptic('success');
  }, [valid, haptic]);

  const color = habit?.color ?? colors.accent;
  const title = habit ? milestoneTitle(days, habit.name) : '';
  // Long habit names get a smaller title instead of an ellipsis (react-native-web has
  // no adjustsFontSizeToFit). Card width minus its padding (see CelebrationCard);
  // 0.75 leaves slack for word wrapping across the three lines.
  const titleWidth = Math.min(width - spacing.xl * 2, 400) - spacing.xxl * 2;
  const titleSize = fitFontSize(title, titleWidth * TITLE_LINES * 0.75, TITLE_SIZE, TITLE_MIN_SIZE);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ contentStyle: { backgroundColor: 'transparent' } }} />
      <Animated.View entering={FadeIn.duration(220)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Dismiss celebration" />
      </Animated.View>

      <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]} pointerEvents="box-none">
        <CelebrationCard color={color}>
          {valid && habit ? (
            <>
              <MilestoneBadge days={days} color={color} size={height < 640 ? 112 : 148} />
              <Text variant="overline" color={color} style={styles.kicker}>
                Milestone reached
              </Text>
              <Text
                variant="title"
                center
                style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.2) }]}
                accessibilityRole="header"
                numberOfLines={TITLE_LINES}
                adjustsFontSizeToFit
              >
                {title}
              </Text>
              <Text variant="body" tone="secondary" center style={styles.message}>
                {milestoneMessage(days)}
              </Text>
              <View style={styles.actions}>
                {hasCertificate(days) ? (
                  <>
                    <Button
                      label="Get certificate"
                      icon="certificate-outline"
                      onPress={() => router.replace(`/certificate?habitId=${encodeURIComponent(habit.id)}&days=${days}`)}
                    />
                    <Button label="Share" icon="export-variant" variant="secondary" onPress={() => void shareText(milestoneShareText(days, habit.name), 'Share milestone')} />
                    <Button label="Continue" variant="ghost" onPress={close} />
                  </>
                ) : (
                  <>
                    <Button label="Continue" onPress={close} />
                    <Button label="Share" icon="export-variant" variant="secondary" onPress={() => void shareText(milestoneShareText(days, habit.name), 'Share milestone')} />
                  </>
                )}
              </View>
            </>
          ) : (
            <>
              <View style={[styles.missingIcon, { backgroundColor: withAlpha(color, 0.15), borderColor: withAlpha(color, 0.35) }]}>
                <Icon name="party-popper" size={30} color={color} />
              </View>
              <Text variant="heading" center style={styles.missingTitle}>
                Celebration unavailable
              </Text>
              <Text variant="body" tone="secondary" center style={styles.message}>
                {habit && !habit.archived
                  ? "This milestone isn't part of your current streak yet — keep going, it's on its way."
                  : 'This milestone is no longer available — the habit may have been removed.'}
              </Text>
              <View style={styles.actions}>
                <Button label="Continue" onPress={close} />
              </View>
            </>
          )}
        </CelebrationCard>
      </View>

      {valid ? <Confetti seed={hashSeed(`${params.habitId}:${days}`)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  backdrop: { backgroundColor: colors.overlay },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { marginTop: spacing.lg },
  title: { alignSelf: 'stretch', marginTop: spacing.sm },
  missingTitle: { marginTop: spacing.sm },
  message: { marginTop: spacing.sm, maxWidth: 300, lineHeight: 21 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xxl },
  missingIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
