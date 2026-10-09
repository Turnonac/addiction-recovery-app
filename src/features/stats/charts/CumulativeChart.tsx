import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import type { SavingsPoint } from '@/domain/stats';
import { colors, habitColors } from '@/theme';
import { useLayoutWidth } from '../components/useLayoutWidth';
import { axisCompact, hoursTick, spanLabel } from '../format';
import { AXIS_COLOR, AXIS_FONT, GRID_COLOR } from './axis';
import { areaPath, evenTicks, linearScale, monotonePath, type Point } from './geometry';

export const MONEY_COLOR = colors.success;
export const TIME_COLOR = habitColors.blue;

export interface CumulativeChartProps {
  series: SavingsPoint[];
  /** Currency charted on the left axis (null = no money tracked). */
  currency: string | null;
  /** Draw the time-saved line on the right axis. */
  showTime: boolean;
  height?: number;
}

const AXIS_W = 40;
const TOP = 12;
const BOTTOM = 22;

/**
 * Cumulative money (green area + line, left axis) and time saved (blue line, right
 * axis in hours) from the first quit date until now.
 */
export function CumulativeChart({ series, currency, showTime, height = 220 }: CumulativeChartProps) {
  const [width, onLayout] = useLayoutWidth();
  const gid = `cs${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const hasMoney = currency != null;
  const hasTime = showTime;
  const left = AXIS_W;
  const right = Math.max(left, width - (hasMoney && hasTime ? AXIS_W + 4 : 12));
  const bottom = height - BOTTOM;

  const t0 = series[0]?.t ?? 0;
  const t1 = series[series.length - 1]?.t ?? 0;
  const x = linearScale(t0, t1, left, right);
  const money = series.map((p) => (currency ? (p.money[currency] ?? 0) : 0));
  const minutes = series.map((p) => p.minutes);
  const moneyMax = Math.max(...money, 0) || 1;
  const timeMax = Math.max(...minutes, 0) || 60;
  const yMoney = linearScale(0, moneyMax, bottom, TOP);
  const yTime = linearScale(0, timeMax, bottom, TOP);

  const moneyPts: Point[] = series.map((p, i) => ({ x: x(p.t), y: yMoney(money[i]) }));
  const timePts: Point[] = series.map((p, i) => ({ x: x(p.t), y: yTime(minutes[i]) }));
  // The filled series is money when tracked, otherwise time.
  const primary = hasMoney ? moneyPts : timePts;
  const primaryColor = hasMoney ? MONEY_COLOR : TIME_COLOR;
  const primaryLine = monotonePath(primary);
  const timeLine = hasMoney && hasTime ? monotonePath(timePts) : '';
  const end = primary[primary.length - 1];
  const ticks = evenTicks(1, 4);
  const leftLabel = (p: number) => (hasMoney ? axisCompact(moneyMax * p) : hoursTick(timeMax * p, timeMax));
  const leftColor = hasMoney ? MONEY_COLOR : TIME_COLOR;

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel="Cumulative savings chart">
      {width > 0 && series.length > 1 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`${gid}area`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={primaryColor} stopOpacity={0.38} />
              <Stop offset="0.6" stopColor={habitColors.teal} stopOpacity={0.14} />
              <Stop offset="1" stopColor={habitColors.teal} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {ticks.map((p) => (
            <Line
              key={p}
              x1={left}
              x2={right}
              y1={bottom - (bottom - TOP) * p}
              y2={bottom - (bottom - TOP) * p}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
          ))}
          {ticks.map((p) => (
            <SvgText
              key={`l${p}`}
              x={left - 6}
              y={bottom - (bottom - TOP) * p + 3}
              textAnchor="end"
              fill={leftColor}
              fillOpacity={0.8}
              {...AXIS_FONT}
            >
              {leftLabel(p)}
            </SvgText>
          ))}
          {hasMoney && hasTime
            ? ticks.map((p) => (
                <SvgText
                  key={`r${p}`}
                  x={right + 12}
                  y={bottom - (bottom - TOP) * p + 3}
                  textAnchor="start"
                  fill={TIME_COLOR}
                  fillOpacity={0.85}
                  {...AXIS_FONT}
                >
                  {hoursTick(timeMax * p, timeMax)}
                </SvgText>
              ))
            : null}
          <Path d={areaPath(primaryLine, primary, bottom)} fill={`url(#${gid}area)`} />
          <Line x1={end.x} x2={end.x} y1={end.y} y2={bottom} stroke={primaryColor} strokeOpacity={0.25} strokeWidth={1} />
          <Path d={primaryLine} stroke={primaryColor} strokeOpacity={0.25} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Path d={primaryLine} stroke={primaryColor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {timeLine ? (
            <>
              <Path d={timeLine} stroke={TIME_COLOR} strokeOpacity={0.25} strokeWidth={6} fill="none" strokeLinecap="round" />
              <Path d={timeLine} stroke={TIME_COLOR} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 3" />
            </>
          ) : null}
          <Circle cx={end.x} cy={end.y} r={9} fill={hasMoney && hasTime ? TIME_COLOR : primaryColor} fillOpacity={0.3} />
          <Circle cx={end.x} cy={end.y} r={5} fill={colors.bg} stroke={colors.text} strokeWidth={2} />
          <SvgText x={left} y={height - 6} textAnchor="start" fill={AXIS_COLOR} {...AXIS_FONT}>
            0d
          </SvgText>
          <SvgText x={(left + right) / 2} y={height - 6} textAnchor="middle" fill={AXIS_COLOR} {...AXIS_FONT}>
            {spanLabel((t1 - t0) / 2)}
          </SvgText>
          <SvgText x={right} y={height - 6} textAnchor="end" fill={AXIS_COLOR} {...AXIS_FONT}>
            now
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
