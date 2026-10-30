/**
 * CounterStep's "Your counter will show" preview: announced to VoiceOver on iOS
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

const TITLE = 'When should your counter start?';
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
  // Last Red day three days ago, so the step opens on "My last Red day was…".
  await initStore(addDays(todayLocal(), -3));
});

afterEach(() => {
  useAppStore.setState(pristine, true);
});

/** Opens the step on 3 days, then switches to today and back. */
async function switchChoices() {
  await render(<CounterStep onNext={() => undefined} />);
  expect(screen.getByLabelText('Your counter will show: 3 days')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: /^Start counting today/ }));
  expect(screen.getByLabelText('Your counter will show: 0 days')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: /^My last Red day was…/ }));
  expect(screen.getByLabelText('Your counter will show: 3 days')).toBeTruthy();
}

describe('CounterStep preview on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('announces each change, but not on mount (that would cut off the title)', async () => {
    await switchChoices();
    expect(announce.mock.calls).toEqual([[TITLE]]);
    expect(announceWithOptions.mock.calls).toEqual([
      ['Your counter will show: 0 days', { priority: 'high' }],
      ['Your counter will show: 3 days', { priority: 'high' }],
    ]);
  });

  it('announces the date picked in the sheet at high priority', async () => {
    await initStore(null);
    await render(<CounterStep onNext={() => undefined} />);
    // No past date yet, so choosing it opens the sheet; Done picks yesterday.
    await fireEvent.press(screen.getByRole('radio', { name: /^My last Red day was…/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByLabelText('Your counter will show: 1 day')).toBeTruthy();
    expect(announceWithOptions.mock.calls).toEqual([
      ['Your counter will show: 1 day', { priority: 'high' }],
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
    await fireEvent.press(screen.getByRole('radio', { name: /^My last Red day was…/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' })); // picks yesterday
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    const yesterday = addDays(todayLocal(), -1);
    expect(useAppStore.getState().days).toEqual({ [yesterday]: { date: yesterday, color: 3, checkedIn: false } });
  });

  it('keeps a pick before today when the date moves back a day', async () => {
    const onNext = jest.fn();
    await initStore(null);
    const today = todayLocal();
    await render(<CounterStep onNext={onNext} />);
    await fireEvent.press(screen.getByRole('radio', { name: /^My last Red day was…/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' })); // picks yesterday
    expect(screen.getByLabelText('Your counter will show: 1 day')).toBeTruthy();

    // The phone moves to an earlier time zone: the store's today becomes yesterday.
    await act(async () => useAppStore.setState({ today: addDays(today, -1) }));
    expect(screen.getByLabelText('Your counter will show: 1 day')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /^My last Red day was…/ })).toBeTruthy();
  });

  it('back on this step, "Start counting today" removes the saved Red day', async () => {
    // beforeEach saved a last Red day three days ago.
    const onNext = jest.fn();
    await render(<CounterStep onNext={onNext} />);
    await fireEvent.press(screen.getByRole('radio', { name: /^Start counting today/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().days).toEqual({});
  });
});
