/**
 * CounterStep's "Days since last Red" preview: announced to VoiceOver on iOS
 * when it changes (accessibilityLiveRegion only reaches TalkBack on Android), at
 * high priority so the closing picker sheet can't cut it off.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { createMemoryRepository } from '@/data/memoryRepository';
import { addDays, todayLocal } from '@/domain/dates';
import { DEFAULT_SETTINGS, type LocalDate } from '@/domain/types';
import { CounterStep } from '@/features/onboarding/CounterStep';
import { useAppStore } from '@/state/store';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: () => undefined },
}));

const TITLE = 'Do you remember the last time you went red?';
const pristine = useAppStore.getState();

let announce: jest.SpiedFunction<typeof AccessibilityInfo.announceForAccessibility>;
let announceWithOptions: jest.SpiedFunction<
  typeof AccessibilityInfo.announceForAccessibilityWithOptions
>;

/** A last Red day saved by an earlier Continue is a Red day in the log; null = none. */
async function initStore(lastRedDay: LocalDate | null) {
  useAppStore.setState(pristine, true);
  await useAppStore.getState().init(
    createMemoryRepository({
      days: lastRedDay === null ? [] : [{ date: lastRedDay, color: 3, checkedIn: false }],
      behaviors: [],
      settings: { ...DEFAULT_SETTINGS, onboardingDone: false, installDate: null },
    }),
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  announceWithOptions = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
    .mockImplementation(() => {});
  // Last Red day three days ago, so the step opens on "The last day I went red was…".
  await initStore(addDays(todayLocal(), -3));
});

afterEach(() => {
  useAppStore.setState(pristine, true);
});

/** Opens the step on 3 days, then switches to today and back. */
async function switchChoices() {
  await render(<CounterStep onNext={() => undefined} />);
  expect(screen.getByLabelText('Days since last Red: 3')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: /^Count streaks from today/ }));
  expect(screen.getByLabelText('Days since last Red: 0')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: /^The last day I went red was…/ }));
  expect(screen.getByLabelText('Days since last Red: 3')).toBeTruthy();
}

describe('CounterStep preview on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('announces each change, but not on mount (that would cut off the title)', async () => {
    await switchChoices();
    expect(announce.mock.calls).toEqual([[TITLE]]);
    expect(announceWithOptions.mock.calls).toEqual([
      ['Days since last Red: 0', { priority: 'high' }],
      ['Days since last Red: 3', { priority: 'high' }],
    ]);
  });

  it('announces the date picked in the sheet at high priority', async () => {
    await initStore(null);
    await render(<CounterStep onNext={() => undefined} />);
    // No past date yet, so choosing it opens the sheet; Done picks yesterday.
    await fireEvent.press(screen.getByRole('radio', { name: /^The last day I went red was…/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByLabelText('Day since last Red: 1')).toBeTruthy();
    expect(announceWithOptions.mock.calls).toEqual([
      ['Day since last Red: 1', { priority: 'high' }],
    ]);
  });
});

describe('CounterStep preview on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('leaves changes to the live region (no double reading in TalkBack)', async () => {
    await switchChoices();
    expect(announce.mock.calls).toEqual([[TITLE]]);
    expect(announceWithOptions).not.toHaveBeenCalled();
  });
});

describe('CounterStep saving', () => {
  it('saves the last Red day as a Red day in the log', async () => {
    const onNext = jest.fn();
    await initStore(null);
    await render(<CounterStep onNext={onNext} />);
    await fireEvent.press(screen.getByRole('radio', { name: /^The last day I went red was…/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' })); // picks yesterday
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    const yesterday = addDays(todayLocal(), -1);
    expect(useAppStore.getState().days).toEqual({ [yesterday]: { date: yesterday, color: 3, checkedIn: false } });
  });

  it('asks for the date again when the date moves back to the pick', async () => {
    const onNext = jest.fn();
    await initStore(null);
    const today = todayLocal();
    await render(<CounterStep onNext={onNext} />);
    await fireEvent.press(screen.getByRole('radio', { name: /^The last day I went red was…/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' })); // picks yesterday
    expect(screen.getByLabelText('Day since last Red: 1')).toBeTruthy();

    // The phone moves to an earlier time zone: the store's today becomes yesterday, the pick.
    await act(async () => useAppStore.setState({ today: addDays(today, -1) }));
    expect(screen.getByRole('radio', { name: 'The last day I went red was… Pick the date' })).toBeTruthy();
    // The footer button (disabled) and the date button both read "Enter the last day you went red".
    expect(screen.getAllByRole('button', { name: 'Enter the last day you went red' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(screen.queryByLabelText(/since last Red/)).toBeNull();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('back on this step, "Count streaks from today" removes the saved Red day', async () => {
    // beforeEach saved a last Red day three days ago.
    const onNext = jest.fn();
    await render(<CounterStep onNext={onNext} />);
    await fireEvent.press(screen.getByRole('radio', { name: /^Count streaks from today/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().days).toEqual({});
  });
});
