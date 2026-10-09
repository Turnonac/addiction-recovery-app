import { router, useFocusEffect, useLocalSearchParams, useNavigation, useRoute } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Header, Screen, SectionHeader, Text } from '@/components';
import { EXERCISES } from '@/domain/catalog/exercises';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { ExerciseId } from '@/types';
import { ExerciseOption } from './components/ExerciseOption';
import { FillButton } from './components/FillButton';
import { IntensityPicker } from './components/IntensityPicker';
import { PickerIntro } from './components/PickerIntro';
import { FOOTER_FADE, StickyFooter } from './components/StickyFooter';
import {
  intensityParam,
  nextExerciseId,
  parseExerciseId,
  parseHabitId,
  parseIntensity,
  resolveContextHabit,
  runnerHref,
} from './logic/session';

const START_HEIGHT = 58;
const START_FILL = [colors.sosStart, colors.sosEnd] as const;

/** SOS → "Choose exercise": context, optional urge rating, exercise radio list, sticky "Start exercise". */
export function PickerScreen() {
  const params = useLocalSearchParams<{ habitId?: string; before?: string; last?: string }>();
  const navigation = useNavigation();
  const route = useRoute();
  const habits = useStore((s) => s.habits);
  const habit = resolveContextHabit(habits, parseHabitId(params.habitId));
  const now = useNow(60_000);
  const haptic = useHaptics();

  // "Try another exercise" hands back the exercise just done (`?last=`): suggest the next one.
  const last = parseExerciseId(params.last);
  const [selected, setSelected] = useState<ExerciseId>(() => nextExerciseId(last));
  const [seenLast, setSeenLast] = useState(last);
  if (last !== seenLast) {
    setSeenLast(last);
    if (last) setSelected(nextExerciseId(last));
  }
  // One-shot hand-back: clear it, so the next "Try another" (even after the same exercise) counts as new.
  useEffect(() => {
    if (last) navigation.dispatch({ type: 'SET_PARAMS', payload: { params: { last: undefined } }, source: route.key });
  }, [last, navigation, route.key]);

  // The urge rating lives in the URL (`?before=`), so "Try another exercise" can hand
  // the fresh after-rating back to this screen and it survives reloads on web.
  const intensity = parseIntensity(params.before);
  const setIntensity = (n: number | null) => router.setParams({ before: intensityParam(n) });

  // One push per visit: a double tap must not open two runners (or two relapse sheets).
  const navigatingRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      navigatingRef.current = false;
    }, []),
  );
  const pushOnce = (href: string) => {
    if (navigatingRef.current || !navigation.isFocused()) return false;
    navigatingRef.current = true;
    router.push(href);
    return true;
  };

  const start = () => {
    if (pushOnce(runnerHref(selected, habit?.id ?? null, intensity))) haptic('medium');
  };

  const footer = (
    <StickyFooter>
      <FillButton label="Start exercise" fill={START_FILL} size="lg" iconRight="arrow-right" onPress={start} style={styles.start} testID="sos-start" />
    </StickyFooter>
  );

  return (
    <Screen
      glowColor={colors.danger}
      glowIntensity={0.5}
      header={<Header title="Choose exercise" left="back" />}
      footer={footer}
      bottomInset={START_HEIGHT + FOOTER_FADE}
      testID="sos-picker"
    >
      <PickerIntro habit={habit} now={now} />

      <Card style={styles.intensityCard}>
        <IntensityPicker title="How strong is the urge?" value={intensity} onChange={setIntensity} testID="sos-intensity-before" />
      </Card>

      <SectionHeader title="Exercises" icon="lifebuoy" right={<Text variant="caption" tone="tertiary">{EXERCISES.length}</Text>} />
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Exercises">
        {EXERCISES.map((e) => (
          <ExerciseOption
            key={e.id}
            exercise={e}
            selected={e.id === selected}
            onPress={() => {
              if (e.id !== selected) haptic('selection');
              setSelected(e.id);
            }}
          />
        ))}
      </View>

      {habit ? (
        <Pressable
          onPress={() => pushOnce(`/habit/${habit.id}/relapse`)}
          accessibilityRole="link"
          accessibilityLabel={`I relapsed — log a relapse for ${habit.name}`}
          hitSlop={8}
          style={({ pressed }) => [styles.relapse, pressed && { opacity: 0.6 }]}
          testID="sos-relapsed"
        >
          <Text variant="caption" tone="tertiary">
            Slipped up?{' '}
            <Text variant="captionStrong" tone="secondary" style={styles.underline}>
              I relapsed
            </Text>
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intensityCard: { marginTop: spacing.md },
  list: { gap: spacing.md },
  start: { borderRadius: 20 },
  relapse: { alignSelf: 'center', marginTop: spacing.xl, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  underline: { textDecorationLine: 'underline' },
});
