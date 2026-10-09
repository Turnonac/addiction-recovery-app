import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Chip, Icon, IconTile, Text } from '@/components';
import { formatFieldValue, relativeToNow } from '@/features/habit-form/dateTime/calendar';
import { previewStats, type HabitFormValues } from '@/features/habit-form/formModel';
import { chipMoney, goalLabel } from '@/features/home/homeLogic';
import { useNow } from '@/hooks/useNow';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { formatMinutes } from '@/utils/format';
import { StepLayout } from '../OnboardingChrome';

export interface FinishStepProps {
  name: string;
  habits: HabitFormValues[];
  reminder: boolean;
  saving: boolean;
  onEditHabit: (index: number) => void;
  onStart: () => void;
}

export function FinishStep({ name, habits, reminder, saving, onEditHabit, onStart }: FinishStepProps) {
  const now = useNow(30_000);
  return (
    <StepLayout
      eyebrow={
        <Animated.View entering={ZoomIn.duration(400)} style={styles.badge}>
          <Icon name="check-bold" size={34} color={colors.text} />
        </Animated.View>
      }
      title={name ? `You're all set, ${name}` : "You're all set"}
      subtitle={habits.length === 1 ? "Here's what you're quitting. The clock is already running." : "Here's what you're quitting. The clocks are already running."}
      footer={{ label: 'Start my journey', onPress: onStart, loading: saving, icon: 'rocket-launch-outline', testID: 'onboarding-start' }}
    >
      <View style={styles.list}>
        {habits.map((h, i) => {
          const s = previewStats(h, now);
          return (
            <Animated.View key={h.kind} entering={FadeInDown.delay(80 * i).duration(400)}>
              <Pressable
                onPress={() => onEditHabit(i)}
                accessibilityRole="button"
                accessibilityLabel={`${h.name}. Quit ${formatFieldValue(h.startedAt, now)}. Edit`}
                style={({ pressed }) => [styles.card, { borderColor: withAlpha(h.color, 0.35), backgroundColor: withAlpha(h.color, 0.07) }, pressed && styles.pressed]}
              >
                <View style={[styles.bar, { backgroundColor: h.color }]} />
                <IconTile icon={h.icon} color={h.color} size={44} />
                <View style={styles.texts}>
                  <Text variant="subheading" numberOfLines={1}>
                    {h.name}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    Quit {formatFieldValue(h.startedAt, now)} · {relativeToNow(h.startedAt, now)}
                  </Text>
                  <View style={styles.chips}>
                    {/* Same wording and chip colors as the habit's card on Home. */}
                    <Chip icon="target" label={`Goal: ${goalLabel(s.goalDays)}`} color={h.color} />
                    {s.dailyCost > 0 ? <Chip icon="cash" label={`${chipMoney(s.dailyCost, h.currency)}/day`} color={colors.success} /> : null}
                    {s.dailyMinutes > 0 ? (
                      <Chip icon="clock-outline" label={`${formatMinutes(s.dailyMinutes)}/day`} color={colors.info} />
                    ) : null}
                  </View>
                </View>
                <Icon name="pencil-outline" size={18} color={colors.textTertiary} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.reminder}>
        <Icon name={reminder ? 'bell-ring-outline' : 'bell-off-outline'} size={18} color={reminder ? colors.accent : colors.textTertiary} />
        <Text variant="caption" tone="secondary" style={styles.flex}>
          {reminder ? 'Daily check-in reminder is on.' : 'Daily reminder is off — you can turn it on in Settings.'}
        </Text>
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    marginTop: spacing.lg,
    shadowColor: colors.success,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  list: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  bar: { position: 'absolute', left: 0, top: spacing.md, bottom: spacing.md, width: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  texts: { flex: 1, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingHorizontal: 2 },
});
