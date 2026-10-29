import { Text, View } from 'react-native';

import { useAppTheme } from '@/ui/theme';

export interface StepProgressProps {
  /** Current step, 1-based. Steps 1..step are filled. */
  step: number;
  total: number;
  /** Text under the bar. Default 'Step {step} of {total}'. */
  caption?: string;
}

/** Onboarding progress: one short bar per step, plus a caption that carries the meaning. */
export function StepProgress({ step, total, caption }: StepProgressProps) {
  const theme = useAppTheme();
  const bars = Array.from({ length: Math.max(total, 0) }, (_, i) => i + 1);
  return (
    <View style={{ gap: 8 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: 6 }}
      >
        {bars.map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: n <= step ? theme.accent : theme.line,
            }}
          />
        ))}
      </View>
      <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>
        {caption ?? `Step ${step} of ${total}`}
      </Text>
    </View>
  );
}
