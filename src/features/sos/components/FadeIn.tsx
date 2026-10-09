import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface FadeInProps {
  /** Re-runs the fade whenever this changes (e.g. a message index). */
  id: string | number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}

/** Fades + lifts its children in each time `id` changes (rotating messages, step cards). */
export function FadeIn({ id, children, style, duration = 450 }: FadeInProps) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.set(0);
    o.set(withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [id, duration, o]);
  const animated = useAnimatedStyle(() => ({
    opacity: o.get(),
    transform: [{ translateY: (1 - o.get()) * 10 }],
  }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}
