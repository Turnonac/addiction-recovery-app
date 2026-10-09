import { View } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

import type { DayCell } from '@/domain/stats';
import { colors, withAlpha } from '@/theme';
import { useLayoutWidth } from '../components/useLayoutWidth';
import { AXIS_COLOR, AXIS_FONT } from './axis';
import { similarHue } from './geometry';

export interface CalendarHeatmapProps {
  /** Weeks (oldest first) × 7 days. */
  grid: DayCell[][];
  color: string;
  /** Number of habits in scope; clean-day opacity scales with clean / total when > 1. */
  habitCount: number;
  weekStartsOn: 0 | 1;
}

const LEFT = 16;
const TOP = 16;
const GAP = 4;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Fill color for clean days: the habit's own color, unless it is a red that would read
 * like the relapse markers (e.g. the Smoking preset); then the success green.
 */
export function cleanDayColor(habitColor: string): string {
  return similarHue(habitColor, colors.danger, 20) ? colors.success : habitColor;
}

/** Opacity of a clean day's fill: full for one habit, 0.25..0.9 by share of clean habits otherwise. */
function cleanOpacity(cell: DayCell, habitCount: number): number {
  if (cell.clean <= 0) return 0;
  if (habitCount <= 1) return 0.72;
  return 0.22 + 0.68 * Math.min(1, cell.clean / habitCount);
}

/** GitHub-style grid: columns are weeks, rows are weekdays. */
export function CalendarHeatmap({ grid, color, habitCount, weekStartsOn }: CalendarHeatmapProps) {
  const [width, onLayout] = useLayoutWidth();
  const cols = grid.length;
  const cell = cols ? Math.max(6, Math.min(24, (width - LEFT - GAP * (cols - 1)) / cols)) : 0;
  const height = TOP + 7 * cell + 6 * GAP;
  const gridW = cols * cell + (cols - 1) * GAP;
  const x0 = LEFT + Math.max(0, (width - LEFT - gridW) / 2);

  // Month label above the first column of each new month. Labels need ~3 columns of room:
  // a cramped leading partial month gives way to the next one, later ones are skipped.
  const monthLabels: { col: number; label: string }[] = [];
  grid.forEach((week, c) => {
    const m = new Date(week[0].date).getMonth();
    const prev = c > 0 ? new Date(grid[c - 1][0].date).getMonth() : -1;
    if (m === prev) return;
    const last = monthLabels[monthLabels.length - 1];
    if (last && c - last.col < 3) {
      if (last.col === 0) monthLabels.pop();
      else return;
    }
    monthLabels.push({ col: c, label: MONTHS[m] });
  });

  return (
    <View onLayout={onLayout} style={{ height: width ? height : 7 * 24 + TOP }} accessibilityLabel="Calendar of clean and relapse days">
      {width > 0 && cols > 0 && (
        <Svg width={width} height={height}>
          {monthLabels.map((m) => (
            <SvgText key={m.col} x={x0 + m.col * (cell + GAP)} y={10} fill={AXIS_COLOR} {...AXIS_FONT}>
              {m.label}
            </SvgText>
          ))}
          {Array.from({ length: 7 }, (_, r) =>
            r % 2 === 0 ? (
              <SvgText key={r} x={0} y={TOP + r * (cell + GAP) + cell / 2 + 3} fill={AXIS_COLOR} {...AXIS_FONT}>
                {DAY_LETTERS[(r + weekStartsOn) % 7]}
              </SvgText>
            ) : null,
          )}
          {grid.map((week, c) =>
            week.map((d, r) => {
              const x = x0 + c * (cell + GAP);
              const y = TOP + r * (cell + GAP);
              const op = cleanOpacity(d, habitCount);
              const fill =
                d.status === 'future'
                  ? 'rgba(255,255,255,0.015)'
                  : op > 0
                    ? withAlpha(color, op)
                    : d.status === 'relapse'
                      ? withAlpha(colors.danger, 0.2)
                      : d.status === 'untracked'
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(255,255,255,0.07)';
              return (
                <Rect
                  key={d.date}
                  x={x}
                  y={y}
                  width={cell}
                  height={cell}
                  rx={Math.min(6, cell * 0.28)}
                  fill={fill}
                  stroke={d.isToday ? colors.text : d.status === 'future' ? 'rgba(255,255,255,0.05)' : 'none'}
                  strokeWidth={d.isToday ? 1.5 : 1}
                />
              );
            }),
          )}
          {grid.map((week, c) =>
            week.map((d, r) =>
              d.relapses > 0 ? (
                <Circle
                  key={`r${d.date}`}
                  cx={x0 + c * (cell + GAP) + cell / 2}
                  cy={TOP + r * (cell + GAP) + cell / 2}
                  r={Math.max(2.5, cell * 0.17)}
                  fill={colors.danger}
                  stroke={colors.bg}
                  strokeWidth={1.5}
                />
              ) : null,
            ),
          )}
        </Svg>
      )}
    </View>
  );
}
