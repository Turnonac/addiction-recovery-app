import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export interface OrbProps {
  size: number;
  color: string;
  /** 0..1 overall strength. */
  intensity?: number;
}

/** Soft glowing sphere (radial gradient) used by the breathing and meditation visuals. */
export function Orb({ size, color, intensity = 1 }: OrbProps) {
  const id = `orb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = size / 2;
  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="42%" r="58%" fx="50%" fy="35%">
            <Stop offset="0" stopColor={color} stopOpacity={0.75 * intensity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.32 * intensity} />
            <Stop offset="1" stopColor={color} stopOpacity={0.06 * intensity} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 1} fill={`url(#${id})`} stroke={color} strokeOpacity={0.55 * intensity} strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
