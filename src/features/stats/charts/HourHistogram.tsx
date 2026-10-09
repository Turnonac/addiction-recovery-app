import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme';
import { useLayoutWidth } from '../components/useLayoutWidth';
import { AXIS_COLOR, AXIS_FONT, GRID_COLOR } from './axis';
import { linearScale, roundedTopBar } from './geometry';

export interface HourHistogramProps {
  /** 24 counts, index = hour of day. */
  counts: number[];
  /** Highlighted hour (peak), -1 for none. */
  peak: number;
  height?: number;
}

const TOP = 8;
const BOTTOM = 20;

/** 24 vertical bars of relapses by hour of day; the busiest hour glows. */
export function HourHistogram({ counts, peak, height = 120 }: HourHistogramProps) {
  const [width, onLayout] = useLayoutWidth();
  const gid = `hh${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const max = Math.max(1, ...counts);
  const bottom = height - BOTTOM;
  const y = linearScale(0, max, bottom, TOP);
  const slot = width / 24;
  const barW = Math.max(2, slot * 0.62);

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel="Relapses by hour of day">
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`${gid}g`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.sosEnd} />
              <Stop offset="1" stopColor={colors.purple} />
            </LinearGradient>
          </Defs>
          <Line x1={0} x2={width} y1={bottom} y2={bottom} stroke={GRID_COLOR} strokeWidth={1} />
          {counts.map((c, h) => {
            if (c <= 0) {
              return <Path key={h} d={roundedTopBar(h * slot + (slot - barW) / 2, bottom - 2, barW, 2, 1)} fill="rgba(255,255,255,0.08)" />;
            }
            const top = y(c);
            return (
              <Path
                key={h}
                d={roundedTopBar(h * slot + (slot - barW) / 2, top, barW, bottom - top, 3)}
                fill={h === peak ? `url(#${gid}g)` : colors.purple}
                fillOpacity={h === peak ? 1 : 0.45}
              />
            );
          })}
          {[0, 6, 12, 18].map((h) => (
            <SvgText key={h} x={h * slot + slot / 2} y={height - 6} textAnchor="middle" fill={AXIS_COLOR} {...AXIS_FONT}>
              {`${h < 10 ? '0' : ''}${h}`}
            </SvgText>
          ))}
          <SvgText x={width - slot / 2} y={height - 6} textAnchor="middle" fill={AXIS_COLOR} {...AXIS_FONT}>
            23
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
