import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Icon } from '@/components';
import { MOODS } from '@/domain/catalog/moods';
import type { MoodDay } from '@/domain/stats';
import { useLayoutWidth } from '../components/useLayoutWidth';
import { AXIS_COLOR, AXIS_FONT, GRID_COLOR } from './axis';
import { areaPath, linearScale, monotonePath, type Point } from './geometry';

export interface MoodLineChartProps {
  days: MoodDay[];
  height?: number;
}

const LEFT = 26;
const RIGHT = 8;
const TOP = 10;
const BOTTOM = 22;

const moodColorFor = (avg: number) => MOODS[Math.min(4, Math.max(0, Math.round(avg) - 1))].color;

/** Daily average mood (1..5, weather icons on the y axis) over the last N days. */
export function MoodLineChart({ days, height = 190 }: MoodLineChartProps) {
  const [width, onLayout] = useLayoutWidth();
  const gid = `ml${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const bottom = height - BOTTOM;
  const x = linearScale(0, Math.max(1, days.length - 1), LEFT + 6, width - RIGHT - 6);
  const y = linearScale(1, 5, bottom - 6, TOP + 6);
  const pts: (Point & { avg: number })[] = [];
  days.forEach((d, i) => {
    if (d.average != null) pts.push({ x: x(i), y: y(d.average), avg: d.average });
  });
  const line = monotonePath(pts);

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel="Mood over the last 30 days">
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={`${gid}stroke`} gradientUnits="userSpaceOnUse" x1="0" y1={y(5)} x2="0" y2={y(1)}>
                {MOODS.slice()
                  .reverse()
                  .map((m, i) => (
                    <Stop key={m.id} offset={String(i / 4)} stopColor={m.color} />
                  ))}
              </LinearGradient>
              <LinearGradient id={`${gid}area`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={MOODS[3].color} stopOpacity={0.18} />
                <Stop offset="1" stopColor={MOODS[0].color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {MOODS.map((m) => (
              <Line
                key={m.id}
                x1={LEFT}
                x2={width - RIGHT}
                y1={y(m.score)}
                y2={y(m.score)}
                stroke={GRID_COLOR}
                strokeWidth={1}
                strokeDasharray={m.score === 3 ? undefined : '3 4'}
              />
            ))}
            {pts.length > 1 && <Path d={areaPath(line, pts, bottom)} fill={`url(#${gid}area)`} />}
            {pts.length > 1 && (
              <Path d={line} stroke={`url(#${gid}stroke)`} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {pts.map((p) => (
              <Circle key={p.x} cx={p.x} cy={p.y} r={4} fill={moodColorFor(p.avg)} stroke="rgba(0,0,0,0.6)" strokeWidth={1.5} />
            ))}
            <SvgText x={LEFT + 6} y={height - 6} textAnchor="start" fill={AXIS_COLOR} {...AXIS_FONT}>
              {`${days.length - 1}d ago`}
            </SvgText>
            <SvgText x={(LEFT + width - RIGHT) / 2} y={height - 6} textAnchor="middle" fill={AXIS_COLOR} {...AXIS_FONT}>
              {`${Math.round((days.length - 1) / 2)}d ago`}
            </SvgText>
            <SvgText x={width - RIGHT - 6} y={height - 6} textAnchor="end" fill={AXIS_COLOR} {...AXIS_FONT}>
              today
            </SvgText>
          </Svg>
          {MOODS.map((m) => (
            <View key={m.id} pointerEvents="none" style={[styles.icon, { top: y(m.score) - 8 }]}>
              <Icon name={m.icon} size={15} color={m.color} />
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { position: 'absolute', left: 0, width: 18, height: 16, alignItems: 'center' },
});
