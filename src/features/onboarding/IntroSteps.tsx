import { Text, View } from 'react-native';

import { COLOR_LEVELS, COLOR_MEANINGS, COLOR_NAMES, RED } from '@/domain/types';
import { CheckList, StepScreen } from '@/features/onboarding/StepLayout';
import { Button, ColorGlyph } from '@/ui/components';
import { useAppTheme } from '@/ui/theme';

const PRIVACY_PROMISES = [
  'No account. Nothing to sign up for.',
  'Everything you enter stays on this phone.',
  'No ads, no analytics, no tracking.',
  'Reminders never say what the app is for.',
] as const;

export interface StepNavProps {
  onNext: () => void;
  onBack?: () => void;
}

/** Step 1: welcome + privacy promise. */
export function WelcomeStep({ onNext }: StepNavProps) {
  return (
    <StepScreen
      step={1}
      title="Welcome to Light2Life"
      subtitle="A simple, private daily check-in for your recovery: one honest color a day, and one call with someone who prays for you."
      footer={<Button title="Get started" size="lg" onPress={onNext} />}
    >
      <CheckList items={PRIVACY_PROMISES} />
    </StepScreen>
  );
}

/** Step 2: how the four colors work. */
export function ColorsIntroStep({ onNext, onBack }: StepNavProps) {
  const theme = useAppTheme();
  const red = theme.levels[RED];
  return (
    <StepScreen
      step={2}
      onBack={onBack}
      title="How colors work"
      subtitle="Each day, pick your lowest color: the lowest moment of the day, even if the rest went well."
      footer={<Button title="Continue" size="lg" onPress={onNext} />}
    >
      <View
        style={{
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: theme.radius,
        }}
      >
        {COLOR_LEVELS.map((level) => (
          <View key={level} style={{ gap: 10 }}>
            <View
              accessible
              accessibilityLabel={`${COLOR_NAMES[level]}: ${COLOR_MEANINGS[level]}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <ColorGlyph level={level} size={34} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>
                  {COLOR_NAMES[level]}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 19 }}>
                  {COLOR_MEANINGS[level]}
                </Text>
              </View>
            </View>
            {level === RED ? (
              <View
                accessible
                style={{
                  gap: 4,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: theme.cardRadius,
                  backgroundColor: red.soft,
                }}
              >
                <Text style={{ color: red.ink, fontSize: 14, lineHeight: 20, fontWeight: '600' }}>
                  Red restarts your counter at 0. Your history and best streak stay.
                </Text>
                <Text style={{ color: red.ink, fontSize: 13, lineHeight: 18 }}>
                  God&apos;s grace doesn&apos;t reset.
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
        A worse moment replaces a better one. Missed a day? You can fill it in later, and unlogged
        days never reset your counter.
      </Text>
    </StepScreen>
  );
}
