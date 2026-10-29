import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { COLOR_LEVELS } from '@/domain/types';
import { ColorListStep } from '@/features/onboarding/ColorListStep';
import { CounterStep } from '@/features/onboarding/CounterStep';
import { DoneStep } from '@/features/onboarding/DoneStep';
import { ColorsIntroStep, WelcomeStep } from '@/features/onboarding/IntroSteps';
import { PartnerStep } from '@/features/onboarding/PartnerStep';
import { ReminderStep } from '@/features/onboarding/ReminderStep';

type StepId = 'welcome' | 'colors' | 'counter' | 'partner' | 'lists' | 'reminder' | 'done';

/** Where the user is: a step, plus which color page inside 'lists' (0..3). */
interface Position {
  step: StepId;
  list: number;
}

const ORDER: readonly StepId[] = [
  'welcome',
  'colors',
  'counter',
  'partner',
  'lists',
  'reminder',
  'done',
];
const LAST_LIST = COLOR_LEVELS.length - 1;

function nextPosition({ step, list }: Position): Position {
  if (step === 'lists' && list < LAST_LIST) return { step, list: list + 1 };
  const i = ORDER.indexOf(step);
  const next = ORDER[Math.min(i + 1, ORDER.length - 1)];
  return { step: next, list: 0 };
}

function previousPosition({ step, list }: Position): Position | null {
  if (step === 'lists' && list > 0) return { step, list: list - 1 };
  const i = ORDER.indexOf(step);
  if (i <= 0) return null;
  const prev = ORDER[i - 1];
  return { step: prev, list: prev === 'lists' ? LAST_LIST : 0 };
}

/**
 * First-run setup. Each step saves as it goes (counter start, partner,
 * behaviors, reminder); "Start" calls completeOnboarding() and opens the tabs.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const [pos, setPos] = useState<Position>({ step: 'welcome', list: 0 });

  const next = () => setPos((p) => nextPosition(p));
  const back = () => setPos((p) => previousPosition(p) ?? p);

  // Android back button moves to the previous step instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = previousPosition(pos);
      if (prev === null) return false;
      setPos(prev);
      return true;
    });
    return () => sub.remove();
  }, [pos]);

  switch (pos.step) {
    case 'welcome':
      return <WelcomeStep key="welcome" onNext={next} />;
    case 'colors':
      return <ColorsIntroStep key="colors" onNext={next} onBack={back} />;
    case 'counter':
      return <CounterStep key="counter" onNext={next} onBack={back} />;
    case 'partner':
      return <PartnerStep key="partner" onNext={next} onBack={back} />;
    case 'lists': {
      const level = COLOR_LEVELS[pos.list] ?? COLOR_LEVELS[0];
      return (
        <ColorListStep
          key={`lists-${level}`}
          level={level}
          onNext={next}
          onBack={back}
          onSkip={() => setPos({ step: 'reminder', list: 0 })}
        />
      );
    }
    case 'reminder':
      return <ReminderStep key="reminder" onNext={next} onBack={back} />;
    case 'done':
      return <DoneStep key="done" onNext={next} onBack={back} onFinish={() => router.replace('/(tabs)')} />;
  }
}
