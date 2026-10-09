import { Platform } from 'react-native';
import { FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';

/**
 * Entering animation for a wizard step. Native slides in from the side of travel;
 * web uses a plain fade because Reanimated's web slide keyframes leave the
 * document scrollable past the viewport afterwards.
 */
export function stepEntering(direction: 'forward' | 'back', duration = 280) {
  if (Platform.OS === 'web') return FadeIn.duration(duration);
  return (direction === 'back' ? FadeInLeft : FadeInRight).duration(duration);
}
