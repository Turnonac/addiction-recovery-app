/**
 * Smoke tests for the Settings, check-in, call and onboarding routes, rendered
 * through expo-router's testing library with the in-memory repository.
 * Native services are mocked; the store and domain rules are real.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import SettingsLayout, { unstable_settings } from '@/app/(tabs)/settings/_layout';
import AboutScreen from '@/app/(tabs)/settings/about';
import ColorsScreen from '@/app/(tabs)/settings/colors';
import SettingsScreen from '@/app/(tabs)/settings/index';
import PartnerScreen from '@/app/(tabs)/settings/partner';
import CallScreen from '@/app/call';
import CheckInScreen from '@/app/check-in';
import OnboardingScreen from '@/app/onboarding';
import { createMemoryRepository } from '@/data/memoryRepository';
import { addDays, todayLocal } from '@/domain/dates';
import { DEFAULT_SETTINGS, type DayLog, type Settings } from '@/domain/types';
import * as notifications from '@/services/notifications';
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
jest.mock('@/services/notifications', () => ({
  getPermission: jest.fn(async () => 'granted'),
  requestPermission: jest.fn(async () => true),
  scheduleDailyReminder: jest.fn(async () => undefined),
  cancelDailyReminder: jest.fn(async () => undefined),
  reconcileReminder: jest.fn(async () => undefined),
}));
jest.mock('@/services/contacts', () => ({
  pickPartnerContact: jest.fn(async () => ({ status: 'unavailable' })),
}));
jest.mock('@/services/backupFiles', () => ({
  shareBackupFile: jest.fn(async () => true),
  pickBackupFile: jest.fn(async () => null),
  isBackupReadError: () => false,
}));
jest.mock('@/services/dialer', () => ({
  callPhone: jest.fn(async () => true),
  sanitizePhone: (phone: string) => phone.replace(/[^0-9+*#]/g, ''),
}));

const pristine = useAppStore.getState();

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  '(tabs)/index': () => <Text>Today tab</Text>,
  '(tabs)/settings/_layout': { default: SettingsLayout, unstable_settings },
  '(tabs)/settings/index': SettingsScreen,
  '(tabs)/settings/colors': ColorsScreen,
  '(tabs)/settings/partner': PartnerScreen,
  '(tabs)/settings/about': AboutScreen,
  'check-in': CheckInScreen,
  call: CallScreen,
  onboarding: OnboardingScreen,
};

const SAM = { name: 'Sam', phone: '555 0100' };

async function setup(settings: Partial<Settings> = {}, days: DayLog[] = []) {
  useAppStore.setState(pristine, true);
  const today = todayLocal();
  await useAppStore.getState().init(
    createMemoryRepository({
      days,
      behaviors: [],
      settings: {
        ...DEFAULT_SETTINGS,
        onboardingDone: true,
        installDate: addDays(today, -3),
        counterStartDate: addDays(today, -3),
        ...settings,
      },
    }),
  );
  return today;
}

describe('check-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves the picked color for today', async () => {
    const today = await setup({ partner: SAM });
    await renderRouter(routes, { initialUrl: '/check-in' });

    expect(screen.getByText('What was your lowest color today?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pick a color to save' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: /^Blue/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save check-in' }));

    await waitFor(() => expect(useAppStore.getState().days[today]?.color).toBe(1));
  });

  it('shows the grace note and the call label for Red', async () => {
    await setup({ partner: SAM });
    await renderRouter(routes, { initialUrl: '/check-in' });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));

    expect(screen.getByText('Your counter restarts at 0. Your history and best streak stay.')).toBeTruthy();
    expect(screen.getByText("God's grace doesn't reset.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save, then call Sam' })).toBeTruthy();
  });

  it('asks about past dates in the past tense and shows the stored color', async () => {
    const today = await setup({}, [{ date: addDays(todayLocal(), -1), color: 2, checkedIn: false }]);
    await renderRouter(routes, { initialUrl: `/check-in?date=${addDays(today, -1)}` });

    expect(screen.getByText('What was your lowest color that day?')).toBeTruthy();
    expect(screen.getByText('Currently: Yellow')).toBeTruthy();
  });
});

describe('call', () => {
  it('prompts to add a partner when there is none', async () => {
    await setup();
    await renderRouter(routes, { initialUrl: '/call' });
    expect(screen.getByText('Add your partner first')).toBeTruthy();
  });

  it('shows the window and marks today as checked in', async () => {
    const today = await setup({ partner: SAM }, [
      { date: addDays(todayLocal(), -1), color: 1, checkedIn: false },
    ]);
    await renderRouter(routes, { initialUrl: '/call' });

    expect(screen.getByText('Call with Sam')).toBeTruthy();
    expect(screen.getByText('Since you started')).toBeTruthy();
    expect(screen.getByText('Lowest logged color')).toBeTruthy();
    expect(screen.getByRole('button', { name: "Log today’s color" })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /I talked with Sam/ }));
    await waitFor(() => expect(useAppStore.getState().days[today]?.checkedIn).toBe(true));
    expect(await screen.findByText('You already talked with Sam today.')).toBeTruthy();
  });
});

describe('settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sections and turns the reminder on', async () => {
    await setup({ partner: SAM });
    await renderRouter(routes, { initialUrl: '/settings' });

    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Write what each color looks like for you')).toBeTruthy();
    expect(screen.getByText('Export backup file')).toBeTruthy();

    await fireEvent.press(screen.getByRole('switch', { name: 'Remind me to check in' }));
    await waitFor(() => expect(useAppStore.getState().settings.reminder.enabled).toBe(true));
    expect(notifications.scheduleDailyReminder).toHaveBeenCalledWith(21, 0);
  });

  it('adds a behavior from My colors and keeps the locked Red line', async () => {
    await setup();
    await renderRouter(routes, { initialUrl: '/settings/colors' });

    expect(screen.getByLabelText('Viewing anything explicit, locked')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add a Green behavior' }));
    await fireEvent.changeText(screen.getByLabelText('Green behavior'), '  Called Sam ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(useAppStore.getState().behaviors).toHaveLength(1));
    expect(useAppStore.getState().behaviors[0]).toMatchObject({ color: 0, text: 'Called Sam' });
    expect(await screen.findByRole('button', { name: 'Edit: Called Sam' })).toBeTruthy();
  });

  it('saves a typed partner after contacts are unavailable', async () => {
    await setup();
    await renderRouter(routes, { initialUrl: '/settings/partner' });

    expect(screen.getByText('No partner yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from contacts' }));
    expect(
      await screen.findByText("Contacts can't be opened here. Type the name and number instead."),
    ).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Sam');
    await fireEvent.changeText(screen.getByLabelText('Phone'), '555 0100');
    await fireEvent.press(screen.getByRole('button', { name: 'Save partner' }));

    await waitFor(() => expect(useAppStore.getState().settings.partner).toEqual(SAM));
  });

  it('shows the disclaimer on About', async () => {
    await setup();
    await renderRouter(routes, { initialUrl: '/settings/about' });
    expect(
      screen.getByText(
        'WalkInLight is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.',
      ),
    ).toBeTruthy();
  });
});

describe('onboarding', () => {
  it('walks through every step, saving as it goes', async () => {
    const today = await setup({ onboardingDone: false, installDate: null, counterStartDate: null });
    const view = await renderRouter(routes, { initialUrl: '/onboarding' });

    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('When should your counter start?')).toBeTruthy();
    expect(screen.getByLabelText('Your counter will show: 0 days')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Step 4 of 6 · The most important step')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Skip for now · Today will remind you' }));
    expect(useAppStore.getState().settings.counterStartDate).toBe(today);

    expect(await screen.findByText('What does Green look like for you?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('What does Blue look like for you?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Write these later' }));

    expect(await screen.findByText('A daily reminder')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'No reminders for now' }));

    expect(await screen.findByText("You're all set")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(useAppStore.getState().settings.onboardingDone).toBe(true));
    expect(useAppStore.getState().settings.installDate).toBe(today);
    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });
});
