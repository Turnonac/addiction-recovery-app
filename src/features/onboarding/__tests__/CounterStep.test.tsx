/**
 * CounterStep's "Your counter will show" preview: announced to VoiceOver on iOS
 * when it changes (accessibilityLiveRegion only reaches TalkBack on Android), at
 * high priority so the closing picker sheet can't cut it off.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
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

async function initStore(counterStartDate: LocalDate | null) {
  useAppStore.setState(pristine, true);
  await useAppStore.getState().init(
    createMemoryRepository({
      days: [],
      behaviors: [],
      settings: {
        ...DEFAULT_SETTINGS,
        onboardingDone: false,
        installDate: null,
        counterStartDate,
      },
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
    await initStore(todayLocal());
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
