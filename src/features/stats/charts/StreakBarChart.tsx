import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { DAY } from '@/domain/time';
import { colors, withAlpha } from '@/theme';
import { useLayoutWidth } from '../components/useLayoutWidth';
import { shortDays } from '../format';
import { AXIS_COLOR, AXIS_FONT, GRID_COLOR } from './axis';
import { distinctFrom, labelIndices, linearScale, roundedTopBar, similarHue } from './geometry';

export interface StreakBar {
  key: string;
  ms: number;
  color: string;
  kind: 'past' | 'current' | 'record';
  /** Also the ongoing streak (a record bar can be current too). */
  current?: boolean;
  label: string;
}

export interface StreakBarChartProps {
  bars: StreakBar[];
  height?: number;
}

/** Hues this close to record gold (e.g. the yellow and amber presets) could pass for the record bar. */
const GOLD_CLASH_DEG = 15;

/** Color of a habit's current-streak bar in "This habit" mode: its own color, or white when that reads as gold. */
export function currentBarColor(habitColor: string): string {
  return distinctFrom(habitColor, colors.gold, colors.text, GOLD_CLASH_DEG);
}

/** True when some other bar could be mistaken for the gold record bar, which then gets a white outline. */
export function recordNeedsOutline(bars: StreakBar[]): boolean {
  return bars.some((b) => b.kind !== 'record' && similarHue(b.color, colors.gold, GOLD_CLASH_DEG));
}

const LEFT = 30;
const TOP = 18;
const BOTTOM = 20;

/** Vertical bars of streak lengths per attempt: record gold, current in the habit color. */
export function StreakBarChart({ bars, height = 170 }: StreakBarChartProps) {
  const [width, onLayout] = useLayoutWidth();
  const gid = `sb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // At least one day of headroom so a fresh streak doesn't fill the whole chart.
  const max = Math.max(...bars.map((b) => b.ms), DAY);
  const plotW = Math.max(0, width - LEFT);
  const plotH = height - TOP - BOTTOM;
  const y = linearScale(0, max, TOP + plotH, TOP);
  const slot = bars.length ? plotW / bars.length : 0;
  const barW = Math.max(3, Math.min(30, slot * 0.62));
  const labelled = new Set(labelIndices(bars.length, Math.max(2, Math.floor(plotW / 30))));
  // Value labels need ~26px each: all bars when roomy, else record/current, else record only.
  const showValue = (b: StreakBar) => (slot >= 26 && bars.length <= 12) || (slot >= 26 && b.kind !== 'past') || b.kind === 'record';
  const outline = recordNeedsOutline(bars);

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel={`Streak lengths for ${bars.length} attempts`}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`${gid}gold`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.gold} stopOpacity={0.55} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((p) => {
            const yy = y(max * p);
            return (
              <Line key={p} x1={LEFT} x2={width} y1={yy} y2={yy} stroke={GRID_COLOR} strokeWidth={1} strokeDasharray={p === 0 ? undefined : '3 4'} />
            );
          })}
          {[0.5, 1].map((p) => (
            <SvgText key={p} x={LEFT - 6} y={y(max * p) + 3} textAnchor="end" fill={AXIS_COLOR} {...AXIS_FONT}>
              {shortDays(max * p)}
            </SvgText>
          ))}
          <SvgText x={LEFT - 6} y={y(0) + 3} textAnchor="end" fill={AXIS_COLOR} {...AXIS_FONT}>
            0
          </SvgText>
          {bars.map((b, i) => {
            const cx = LEFT + slot * i + slot / 2;
            const top = Math.min(y(b.ms), y(0) - 2);
            const fill = b.kind === 'record' ? `url(#${gid}gold)` : b.kind === 'current' ? b.color : withAlpha(b.color, 0.38);
            const outlined = outline && b.kind === 'record';
            return (
              <Path
                key={b.key}
                d={roundedTopBar(cx - barW / 2, top, barW, y(0) - top, 5)}
                fill={fill}
                stroke={outlined ? colors.text : undefined}
                strokeWidth={outlined ? 1.5 : undefined}
              />
            );
          })}
          {bars.map((b, i) => {
            if (!showValue(b)) return null;
            const cx = LEFT + slot * i + slot / 2;
            const top = Math.min(y(b.ms), y(0) - 2);
            const valueColor = b.kind === 'record' ? colors.gold : b.kind === 'current' ? b.color : colors.textSecondary;
            return (
              <SvgText key={`v${b.key}`} x={cx} y={top - 5} textAnchor="middle" fill={valueColor} fontWeight="700" {...AXIS_FONT}>
                {shortDays(b.ms)}
              </SvgText>
            );
          })}
          {bars.map((b, i) =>
            labelled.has(i) ? (
              <SvgText
                key={`x${b.key}`}
                x={LEFT + slot * i + slot / 2}
                y={height - 5}
                textAnchor="middle"
                fill={b.current ? colors.textSecondary : AXIS_COLOR}
                {...AXIS_FONT}
              >
                {b.label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}
