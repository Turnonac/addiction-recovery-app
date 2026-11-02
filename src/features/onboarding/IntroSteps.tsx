import { Text, View } from 'react-native';

import { COLOR_LEVELS, COLOR_MEANINGS, COLOR_NAMES } from '@/domain/types';
import { CheckList, StepScreen } from '@/features/onboarding/StepLayout';
import { Button, ColorGlyph } from '@/ui/components';
import { useAppTheme } from '@/ui/theme';

const PRIVACY_PROMISES = [
  'No account. Nothing to sign up for.',
  'Everything you enter stays on this phone.',
  'No ads, no analytics, no tracking.',
] as const;

export interface StepNavProps {
  onNext: () => void;
  onBack?: () => void;
}

/** Step 1: welcome + privacy promise. */
export function WelcomeStep({ onNext }: StepNavProps) {
  const subtitle = `Do you find it hard to quit your addiction to explicit media? At Light2Life, we believe that on our own individual power, we don't have the strength to fight against addiction. However, we can fight it when we are fully known and loved by God and by others. James 5:16 ESV says, "Therefore, confess your sins to one another and pray for one another, that you may be healed. The prayer of a righteous person has great power as it is working." Light2Life presents to you a simple system for your recovery: make one call a day with a friend, and log one color a day. Let's get started.`;
  return (
    <StepScreen
      step={1}
      title="Welcome to Light2Life"
      footer={<Button title="Get started" size="lg" onPress={onNext} />}
      subtitle={subtitle}
    >
      <CheckList items={PRIVACY_PROMISES} />
    </StepScreen>
  );
}

/** Step 2: how the four colors work. */
export function ColorsIntroStep({ onNext, onBack }: StepNavProps) {
  const theme = useAppTheme();
  return (
    <StepScreen
      step={2}
      onBack={onBack}
      title="How colors work"
      subtitle="Each day, pick your lowest color since the last time you logged. Here are the colors and what they mean:"
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
          </View>
        ))}
      </View>
      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
        Missed a day? You can fill it in later.
      </Text>
    </StepScreen>
  );
}
