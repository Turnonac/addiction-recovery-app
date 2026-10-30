import { COLOR_LEVELS, COLOR_MEANINGS, COLOR_NAMES, RED, type ColorLevel } from '@/domain/types';
import { BehaviorEditor } from '@/features/onboarding/BehaviorEditor';
import { StepScreen, TextLink } from '@/features/onboarding/StepLayout';
import { useAppStore } from '@/state/store';
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
  const partnerName = useAppStore((s) => s.settings.partner?.name.trim() || null);
  const name = COLOR_NAMES[level];
  const position = COLOR_LEVELS.indexOf(level) + 1;

  let subtitle: string;
  if (position === 1) {
    subtitle = `${COLOR_MEANINGS[level]}. Write a few short examples, yourself or with ${partnerName ?? 'your partner'}. They show when you check in, and you can change them any time in Settings.`;
  } else if (level === RED) {
    subtitle = `${COLOR_MEANINGS[level]}. The first line is always there. Add anything else you count as Red.`;
  } else {
    subtitle = `${COLOR_MEANINGS[level]}. Add a few short examples, or leave this for later.`;
  }

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
          <TextLink title="Write these later" onPress={onSkip} accessibilityHint="Skips to the reminder step" />
        </>
      }
    >
      <BehaviorEditor levels={[level]} />
    </StepScreen>
  );
}
