import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { formatLong } from '@/domain/dates';
import { COLOR_NAMES, type ColorLevel, type LocalDate } from '@/domain/types';
import { Check, ChevronLeft, ChevronRight } from '@/ui/icons';
import { LEVEL_GLYPHS, MIN_TOUCH, useAppTheme, type AppTheme } from '@/ui/theme';

export interface MonthCalendarCell {
  /** null = padding cell before day 1 / after the last day. */
  date: LocalDate | null;
  color: ColorLevel | null;
  checkedIn: boolean;
  isToday: boolean;
  /** Future days are drawn muted and cannot be tapped. */
  isFuture: boolean;
  /** Days before install: quiet style (not counted as missed) but still tappable. */
  beforeInstall?: boolean;
}

export interface MonthCalendarProps {
  /** Sunday-first cells padded to full weeks (from `monthGrid()`), length a multiple of 7. */
  cells: readonly MonthCalendarCell[];
  /** Called with a past or today date. */
  onPressDay: (date: LocalDate) => void;
  /** Show the check under checked-in days (true once a partner exists). Default true. */
  showCallMarks?: boolean;
  /** Used in screen-reader labels ("checked in with James"). */
  partnerName?: string;
  /** Header title, e.g. 'October 2026'. The header row is shown when this is set. */
  title?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  /** Default true when the handler is given. Set false for "no future months". */
  canGoPrev?: boolean;
  canGoNext?: boolean;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SIZE = 44;
const MARK_SIZE = 12;
const GAP = 4;
const EMPTY_CELL: MonthCalendarCell = {
  date: null,
  color: null,
  checkedIn: false,
  isToday: false,
  isFuture: false,
};

/**
 * Month grid of 44pt day buttons on a card. Logged days: soft color fill,
 * ink number and a small glyph; check under = checked in. Today has a dashed
 * ring; unlogged past days a gray fill; future days are muted and inert.
 */
export function MonthCalendar({
  cells,
  onPressDay,
  showCallMarks = true,
  partnerName,
  title,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
  canGoNext,
}: MonthCalendarProps) {
  const theme = useAppTheme();
  const weeks: MonthCalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    // Keep columns aligned even if the caller did not pad the last week.
    while (week.length < 7) week.push(EMPTY_CELL);
    weeks.push(week);
  }

  return (
    <View
      style={{
        gap: 10,
        paddingTop: 14,
        paddingBottom: 16,
        paddingHorizontal: 8,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: theme.radius,
      }}
    >
      {title !== undefined ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <MonthNavButton
            direction="prev"
            onPress={onPrevMonth}
            enabled={onPrevMonth !== undefined && canGoPrev !== false}
          />
          <Text
            accessibilityRole="header"
            style={{
              flex: 1,
              textAlign: 'center',
              color: theme.text,
              fontSize: 17,
              fontWeight: '700',
            }}
          >
            {title}
          </Text>
          <MonthNavButton
            direction="next"
            onPress={onNextMonth}
            enabled={onNextMonth !== undefined && canGoNext !== false}
          />
        </View>
      ) : null}

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: GAP }}
      >
        {WEEKDAYS.map((letter, i) => (
          <Text
            key={i}
            maxFontSizeMultiplier={1.4}
            style={{
              flex: 1,
              textAlign: 'center',
              color: theme.muted,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {letter}
          </Text>
        ))}
      </View>

      <View style={{ gap: GAP }}>
        {weeks.map((week, w) => (
          <View key={w} style={{ flexDirection: 'row', gap: GAP }}>
            {week.map((cell, d) => (
              <DayCell
                key={cell.date ?? `pad-${w}-${d}`}
                cell={cell}
                onPressDay={onPressDay}
                showCallMarks={showCallMarks}
                partnerName={partnerName}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthNavButton({
  direction,
  onPress,
  enabled,
}: {
  direction: 'prev' | 'next';
  onPress?: () => void;
  enabled: boolean;
}) {
  const theme = useAppTheme();
  if (onPress === undefined) return <View style={{ width: MIN_TOUCH, height: MIN_TOUCH }} />;
  const color = enabled ? theme.text : theme.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? 'Previous month' : 'Next month'}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => ({
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : enabled ? 1 : 0.6,
      })}
    >
      {direction === 'prev' ? (
        <ChevronLeft size={22} color={color} />
      ) : (
        <ChevronRight size={22} color={color} />
      )}
    </Pressable>
  );
}

interface DayStyle {
  bg: string;
  ink: string;
  border: string;
  dashed: boolean;
}

function dayStyle(cell: MonthCalendarCell, theme: AppTheme): DayStyle {
  if (cell.color !== null) {
    const c = theme.levels[cell.color];
    return { bg: c.soft, ink: c.ink, border: c.solid, dashed: cell.isToday };
  }
  if (cell.isToday) return { bg: 'transparent', ink: theme.text, border: theme.muted, dashed: true };
  if (cell.beforeInstall) {
    return { bg: 'transparent', ink: theme.muted, border: 'transparent', dashed: false };
  }
  // Missed past day: neutral fill invites "tap to make it up".
  return { bg: theme.surface2, ink: theme.text, border: 'transparent', dashed: false };
}

function dayLabel(cell: MonthCalendarCell, date: LocalDate, who: string, showCallMarks: boolean) {
  let label = formatLong(date);
  if (cell.isToday) label += ', today';
  if (cell.isFuture) return `${label}, upcoming`;
  label += ': ';
  if (cell.color !== null) label += COLOR_NAMES[cell.color];
  else label += cell.isToday ? 'not logged yet' : 'not logged';
  if (showCallMarks) {
    if (cell.checkedIn) label += `, checked in with ${who}`;
    else if (!cell.isToday && !cell.beforeInstall) label += ', no call';
  }
  return label;
}

function DayCell({
  cell,
  onPressDay,
  showCallMarks,
  partnerName,
}: {
  cell: MonthCalendarCell;
  onPressDay: (date: LocalDate) => void;
  showCallMarks: boolean;
  partnerName?: string;
}) {
  const theme = useAppTheme();
  const column = { flex: 1, alignItems: 'center', gap: 3, minHeight: 60 } as const;
  const date = cell.date;
  if (date === null) return <View style={column} />;

  const dayNum = String(Number(date.slice(8, 10)));
  const label = dayLabel(cell, date, partnerName ?? 'your partner', showCallMarks);
  const circle = {
    width: '100%',
    maxWidth: DAY_SIZE,
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  if (cell.isFuture) {
    return (
      <View style={column}>
        <View accessible accessibilityLabel={label} style={circle}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}
          >
            {dayNum}
          </Text>
        </View>
      </View>
    );
  }

  const s = dayStyle(cell, theme);
  return (
    <View style={column}>
      <Pressable
        onPress={() => onPressDay(date)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens this day"
        hitSlop={2}
        style={({ pressed }) => [
          circle,
          {
            gap: 1,
            backgroundColor: s.bg,
            borderWidth: 2,
            borderColor: s.border,
            borderStyle: s.dashed ? 'dashed' : 'solid',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.3}
          style={{ color: s.ink, fontSize: 13, lineHeight: 15, fontWeight: '700' }}
        >
          {dayNum}
        </Text>
        {cell.color !== null ? (
          <Svg width={12} height={12} viewBox="0 0 24 24">
            <Path
              d={LEVEL_GLYPHS[cell.color]}
              fill="none"
              stroke={s.ink}
              strokeWidth={3.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </Pressable>
      {showCallMarks && cell.checkedIn ? (
        <Check size={MARK_SIZE} color={theme.accentText} strokeWidth={3.4} />
      ) : (
        <View style={{ width: MARK_SIZE, height: MARK_SIZE }} />
      )}
    </View>
  );
}
