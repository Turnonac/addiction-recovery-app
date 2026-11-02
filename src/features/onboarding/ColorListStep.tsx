import { COLOR_LEVELS, COLOR_MEANINGS, COLOR_NAMES, type ColorLevel } from '@/domain/types';
import { BehaviorEditor } from '@/features/onboarding/BehaviorEditor';
import { StepScreen, TextLink } from '@/features/onboarding/StepLayout';
import { Button } from '@/ui/components';

export interface ColorListStepProps {
  level: ColorLevel;
  onNext: () => void;
  onBack: () => void;
  /** Skip the remaining color pages ("Write these later"). */
  onSkip: () => void;
}

/** Step 5, one page per color: the user's own examples (lists start empty). Saved as they are added. */
export function ColorListStep({ level, onNext, onBack, onSkip }: ColorListStepProps) {
  const name = COLOR_NAMES[level];
  const position = COLOR_LEVELS.indexOf(level) + 1;

  const subtitle = `${COLOR_MEANINGS[level]}. Write a few short examples. You can change them any time in the settings.`;

  return (
    <StepScreen
      step={5}
      caption={`Step 5 of 6 · ${name} (${position} of ${COLOR_LEVELS.length})`}
      onBack={onBack}
      title={`What does ${name} look like for you?`}
      subtitle={subtitle}
      footer={
        <>
          <Button title="Continue" size="lg" onPress={onNext} />
          <TextLink title="Write examples later" onPress={onSkip} accessibilityHint="Write examples later" />
        </>
      }
    >
      <BehaviorEditor levels={[level]} />
    </StepScreen>
  );
}
