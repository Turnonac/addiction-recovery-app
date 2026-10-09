import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components';
import { colors, withAlpha } from '@/theme';

const SIZE = 116;

/** Big animated check: the disc springs in, the tick pops, a soft ring keeps rippling out. */
export function SuccessCheck({ color }: { color: string }) {
  const disc = useSharedValue(0);
  const tick = useSharedValue(0);
  const ripple = useSharedValue(0);

  useEffect(() => {
    disc.set(withSpring(1, { damping: 12, stiffness: 140 }));
    tick.set(withDelay(220, withSpring(1, { damping: 9, stiffness: 180 })));
    ripple.set(withDelay(400, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [disc, tick, ripple]);

  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: disc.get() }], opacity: Math.min(1, disc.get() * 1.5) }));
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: tick.get() }, { rotate: `${(1 - tick.get()) * -25}deg` }] }));
  const rippleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ripple.get() * 0.7 }], opacity: (1 - ripple.get()) * 0.5 }));

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Exercise complete">
      <Animated.View style={[styles.ring, { borderColor: color }, rippleStyle]} />
      <Animated.View style={[styles.disc, { backgroundColor: withAlpha(color, 0.2), borderColor: withAlpha(color, 0.75), shadowColor: color }, discStyle]}>
        <Animated.View style={tickStyle}>
          <Icon name="check-bold" size={58} color={colors.text} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE * 1.8, height: SIZE * 1.8, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2 },
  disc: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});
