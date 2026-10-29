import { Text, View } from 'react-native';

import { formatLong, formatWeekdayLetter } from '@/domain/dates';
import { COLOR_NAMES, type ColorLevel, type LocalDate } from '@/domain/types';
import { ColorGlyph } from '@/ui/components/ColorGlyph';
import { Check, Minus } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

/** Same shape as `weekStrip()` in domain/history.ts, so its result can be passed straight in. */
export interface WeekStripDayItem {
  date: LocalDate;
  color: ColorLevel | null;
  checkedIn: boolean;
  isToday: boolean;
  /** Before the app was installed: no "no call" mark (as in MonthCalendar). */
  beforeInstall?: boolean;
}

export interface WeekStripProps {
  /** Last 7 days, oldest first, ending today. */
  days: readonly WeekStripDayItem[];
  /** Show the check / dash call marks under each day (true once a partner exists). Default true. */
  showCallMarks?: boolean;
  /** Used in screen-reader labels ("checked in with James"). */
  partnerName?: string;
}

const MARK_SIZE = 16;

/**
 * Seven day circles with weekday letters. Logged days show their color glyph,
 * unlogged days a dashed ring. Under each day: check = checked in with the
 * partner, dash = no call (nothing for today until the call happens, and
 * nothing for days before install).
 */
export function WeekStrip({ days, showCallMarks = true, partnerName }: WeekStripProps) {
  const theme = useAppTheme();
  const who = partnerName ?? 'your partner';
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {days.map((day) => {
        const colorText = day.color !== null ? COLOR_NAMES[day.color] : 'not logged yet';
        const missedCall = !day.checkedIn && !day.isToday && !day.beforeInstall;
        let callText = '';
        if (showCallMarks) {
          if (day.checkedIn) callText = `, checked in with ${who}`;
          else if (missedCall) callText = ', no call';
        }
        const label = `${formatLong(day.date)}${day.isToday ? ', today' : ''}: ${colorText}${callText}`;

        let mark = <View style={{ width: MARK_SIZE, height: MARK_SIZE }} />;
        if (showCallMarks && day.checkedIn) {
          mark = <Check size={MARK_SIZE} color={theme.accentText} />;
        } else if (showCallMarks && missedCall) {
          mark = <Minus size={MARK_SIZE} color={theme.muted} />;
        }

        return (
          <View
            key={day.date}
            accessible
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', gap: 6 }}
          >
            <Text
              maxFontSizeMultiplier={1.5}
              style={{
                color: day.isToday ? theme.text : theme.muted,
                fontSize: 12,
                fontWeight: day.isToday ? '800' : '600',
              }}
            >
              {formatWeekdayLetter(day.date)}
            </Text>
            <ColorGlyph level={day.color} size={32} />
            {mark}
          </View>
        );
      })}
    </View>
  );
}
