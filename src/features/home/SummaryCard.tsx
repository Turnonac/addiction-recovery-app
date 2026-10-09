import { router } from 'expo-router';
import { Platform, Pressable, useWindowDimensions } from 'react-native';

import { StatGroup } from '@/components';
import { savingsByCurrency, totalCleanDaysAll, type HabitSnapshot } from '@/domain/habitStats';
import { colors, spacing } from '@/theme';
import { formatInt } from '@/utils/format';
import { savingsIcon, shortCount, summarizeSavings, type SavingsFit } from './homeLogic';

/** StatGroup's value and sub-line font sizes (title variant at 24, micro at 10). */
const VALUE_FONT_SIZE = 24;
const SUB_FONT_SIZE = 10;
/** Horizontal room StatGroup takes from each of its 3 cells (cell padding + dividers, rounded up). */
const CELL_CHROME = 9;

/**
 * Width budgets for the summary values and the SAVED sub line: ~99px cells at
 * 390pt, ~76px at 320pt. StatGroup shrinks long values with
 * `adjustsFontSizeToFit` on iOS/Android, so there the values keep full
 * precision (no value budget) and only web, which has no equivalent, shortens
 * the text itself ("13.3K", "3.8K" + "CHF SAVED"). The sub line can't shrink
 * on any platform, so its budget always applies.
 */
function summaryFit(windowWidth: number): SavingsFit {
  // Screen padding + card padding on both sides, then three equal cells.
  const cell = (windowWidth - spacing.lg * 4) / 3 - CELL_CHROME;
  return { value: Platform.OS === 'web' ? cell / VALUE_FONT_SIZE : Infinity, sub: cell / SUB_FONT_SIZE };
}

/** HABITS · CLEAN DAYS · SAVED, like the top card of the original. Tapping opens Statistics. */
export function SummaryCard({ snapshots }: { snapshots: HabitSnapshot[] }) {
  const { width } = useWindowDimensions();
  // A habit with a corrupt start date has NaN totals; leave it out of the sums
  // so it doesn't wipe out every other habit's days and savings.
  const byCurrency = savingsByCurrency(snapshots.filter((s) => Number.isFinite(s.moneySaved)));
  const fit = summaryFit(width);
  const savings = summarizeSavings(byCurrency, fit);
  const cleanDays = totalCleanDaysAll(snapshots.filter((s) => Number.isFinite(s.totalCleanDays)));
  const habitsLabel = snapshots.length === 1 ? 'Habit' : 'Habits';
  const daysLabel = cleanDays === 1 ? 'Clean day' : 'Clean days';
  // "CHF saved" when the currency symbol left the value (see summarizeSavings).
  const savedLabel = savings.code ? `${savings.code} saved` : 'Saved';
  const savedText = `${savings.value}${savings.code ? ` ${savings.code}` : ''}${savings.sub ? ` ${savings.sub}` : ''}`;
  return (
    <Pressable
      onPress={() => router.push('/stats')}
      accessibilityRole="button"
      accessibilityLabel={`${snapshots.length} ${habitsLabel.toLowerCase()}, ${cleanDays} ${daysLabel.toLowerCase()}, saved ${savedText}`}
      accessibilityHint="Opens statistics"
      testID="home-summary"
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <StatGroup
        uppercaseLabels
        items={[
          { icon: 'cube-outline', color: colors.accent, value: formatInt(snapshots.length), label: habitsLabel },
          { icon: 'fire', color: colors.fire, value: shortCount(cleanDays, fit.value), label: daysLabel },
          { icon: savingsIcon(byCurrency), color: colors.success, value: savings.value, label: savedLabel, sub: savings.sub },
        ]}
      />
    </Pressable>
  );
}
