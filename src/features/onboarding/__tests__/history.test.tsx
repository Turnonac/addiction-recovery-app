/**
 * History tab stat tiles, rendered through expo-router's testing library with the in-memory
 * repository (same setup as screens.test.tsx). The store and domain rules are real.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import HistoryScreen from '@/app/(tabs)/history';
import { createMemoryRepository } from '@/data/memoryRepository';
import type * as Dates from '@/domain/dates';
import { DEFAULT_SETTINGS, type DayLog, type Settings } from '@/domain/types';
import { useAppStore } from '@/state/store';
import { lightTheme } from '@/ui/theme';

const TODAY = '2026-11-03';
jest.mock('@/domain/dates', () => {
  const actual = jest.requireActual<typeof Dates>('@/domain/dates');
  return { ...actual, todayLocal: () => '2026-11-03' };
});

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

const pristine = useAppStore.getState();

afterEach(() => {
  useAppStore.setState(pristine, true);
});

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  '(tabs)/history': HistoryScreen,
  'day/[date]': () => <Text>Day screen</Text>,
};

async function setup(days: DayLog[], settings: Partial<Settings> = {}) {
  useAppStore.setState(pristine, true);
  await useAppStore.getState().init(
    createMemoryRepository({
      days,
      behaviors: [],
      settings: {
        ...DEFAULT_SETTINGS,
        onboardingDone: true,
        installDate: '2026-10-20',
        partner: { name: 'Sam', phone: '555 0100' },
        ...settings,
      },
    }),
  );
  expect(useAppStore.getState().today).toBe(TODAY);
  await renderRouter(routes, { initialUrl: '/history' });
}

const TILE = /, (Days? of prayer|Calls this month|Calls in \w+|Days since last Red)$/;

function tileLabels(): string[] {
  return screen.getAllByLabelText(TILE).map((el) => String(el.props.accessibilityLabel));
}

describe('History stat tiles', () => {
  it('shows calls first, then this month’s calls, then days since last Red, with no best tile', async () => {
    await setup([
      { date: '2026-10-25', color: 0, checkedIn: true },
      { date: '2026-10-28', color: 3, checkedIn: true },
      { date: '2026-11-01', color: 0, checkedIn: true },
      { date: '2026-11-02', color: 1, checkedIn: true },
    ]);

    expect(tileLabels()).toEqual([
      '4, Days of prayer',
      '2/2, Calls this month',
      '6, Days since last Red',
    ]);
    expect(screen.queryByText(/Best/)).toBeNull();
    expect(screen.queryByLabelText(/Best/)).toBeNull();
    // Only the call total is accented.
    expect(screen.getByLabelText('4, Days of prayer')).toHaveStyle({
      backgroundColor: lightTheme.accentSoft,
      borderColor: lightTheme.accent,
    });
    expect(screen.getByLabelText('2/2, Calls this month')).toHaveStyle({
      backgroundColor: lightTheme.surface,
      borderColor: lightTheme.line,
    });
  });

  it('says “Day of prayer” for one call', async () => {
    await setup([{ date: '2026-11-02', color: 0, checkedIn: true }]);
    expect(tileLabels()[0]).toBe('1, Day of prayer');
  });

  it('names the viewed month when it is not the current one', async () => {
    await setup([
      { date: '2026-10-25', color: 0, checkedIn: true },
      { date: '2026-11-02', color: 0, checkedIn: true },
    ]);

    await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));

    // October from install (10-20) through 10-31: 12 days, one call. The call total stays.
    expect(tileLabels()).toEqual([
      '2, Days of prayer',
      '1/12, Calls in October',
      '14, Days since last Red',
    ]);

    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(tileLabels()).toEqual([
      '2, Days of prayer',
      '1/2, Calls this month',
      '14, Days since last Red',
    ]);
  });
});
