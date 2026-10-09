import { StyleSheet, View } from 'react-native';

import { IconTile, TextField } from '@/components';
import { colors, spacing } from '@/theme';
import { StepLayout } from '../OnboardingChrome';

export interface NameStepProps {
  name: string;
  onChange: (name: string) => void;
  onNext: () => void;
}

export function NameStep({ name, onChange, onNext }: NameStepProps) {
  const hasName = name.trim().length > 0;
  return (
    <StepLayout
      eyebrow={
        <View style={styles.eyebrow}>
          <IconTile icon="hand-wave-outline" color={colors.gold} size={52} />
        </View>
      }
      title="What should we call you?"
      subtitle="We'll use it to cheer you on. It stays on this device — and it's optional."
      footer={{ label: hasName ? 'Continue' : 'Skip for now', onPress: onNext, iconRight: hasName ? 'arrow-right' : undefined, testID: 'onboarding-name-next' }}
    >
      <TextField
        value={name}
        onChangeText={onChange}
        placeholder="Your name"
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={30}
        returnKeyType="next"
        onSubmitEditing={onNext}
        accessibilityLabel="Your name"
        testID="onboarding-name"
      />
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.lg, marginBottom: spacing.md },
});
