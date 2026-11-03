/**
 * Smoke tests for the Today, Settings, color log (check-in route), call, day and onboarding routes,
 * and the root layout's reminder tap, rendered through expo-router's testing library with the
 * in-memory repository. Native services are mocked; the store and domain rules are real.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import {
  Alert,
  AppState,
  Dimensions,
  Linking,
  Text,
  type AlertButton,
  type AppStateStatus,
} from 'react-native';

import RootLayout, { unstable_settings as rootSettings } from '@/app/_layout';
import TabsLayout from '@/app/(tabs)/_layout';
import TodayScreen from '@/app/(tabs)/index';
import SettingsLayout, { unstable_settings } from '@/app/(tabs)/settings/_layout';
import AboutScreen from '@/app/(tabs)/settings/about';
import ColorsScreen from '@/app/(tabs)/settings/colors';
import SettingsScreen from '@/app/(tabs)/settings/index';
import PartnerScreen from '@/app/(tabs)/settings/partner';
import CallScreen from '@/app/call';
import CheckInScreen from '@/app/check-in';
import DayScreen from '@/app/day/[date]';
import OnboardingScreen from '@/app/onboarding';
import { createMemoryRepository } from '@/data/memoryRepository';
import { buildBackup } from '@/domain/backup';
import type * as Dates from '@/domain/dates';
import { addDays, formatLong, formatShort, todayLocal, toLocalDate } from '@/domain/dates';
import { DEFAULT_SETTINGS, type DayLog, type Settings } from '@/domain/types';
import { formatDateWithYear, formatTime } from '@/features/onboarding/pickers';
import * as backupFiles from '@/services/backupFiles';
import * as dialer from '@/services/dialer';
import * as notifications from '@/services/notifications';
import { useAppStore } from '@/state/store';
import { lightTheme } from '@/ui/theme';

// Real dates unless a test moves the clock (e.g. past midnight) with mockToday.
let mockToday: string | null = null;
jest.mock('@/domain/dates', () => {
  const actual = jest.requireActual<typeof Dates>('@/domain/dates');
  return { ...actual, todayLocal: () => mockToday ?? actual.todayLocal() };
});

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
  configureForegroundHandler: jest.fn(),
  addReminderTapListener: jest.fn(() => () => undefined),
}));
// The root layout imports the SQLite database; these tests init the store with the in-memory one.
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('@/services/contacts', () => ({
  pickPartnerContact: jest.fn(async () => ({ status: 'unavailable' })),
}));
jest.mock('@/services/backupFiles', () => ({
  deleteBackupCopies: jest.fn(() => true),
  shareBackupFile: jest.fn(async () => true),
  pickBackupFile: jest.fn(async () => null),
  isBackupReadError: () => false,
}));
jest.mock('@/services/dialer', () => ({
  callPhone: jest.fn(async () => true),
}));

const pristine = useAppStore.getState();

afterEach(() => {
  mockToday = null;
  jest.restoreAllMocks();
  jest.mocked(notifications.getPermission).mockImplementation(async () => 'granted');
  jest.mocked(notifications.requestPermission).mockImplementation(async () => true);
  jest.mocked(notifications.addReminderTapListener).mockImplementation(() => () => undefined);
});

/** Records Alert.alert calls; `press` taps a button of the last alert with that title. */
function spyOnAlerts() {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const find = (title: string) => {
    const call = [...spy.mock.calls].reverse().find(([t]) => t === title);
    if (!call) throw new Error(`No alert titled "${title}"`);
    return { message: call[1], buttons: (call[2] ?? []) as AlertButton[] };
  };
  return {
    spy,
    find,
    press: async (title: string, button: string) => {
      const target = find(title).buttons.find((b) => b.text === button);
      if (!target?.onPress) throw new Error(`No button "${button}" on "${title}"`);
      await act(async () => {
        target.onPress?.();
      });
    },
  };
}

/** Sends an AppState change to every listener registered so far (AppState is a jest mock). */
async function emitAppState(state: AppStateStatus) {
  const listeners = jest
    .mocked(AppState.addEventListener)
    .mock.calls.filter(([type]) => type === 'change')
    .map(([, listener]) => listener as (next: AppStateStatus) => void);
  await act(async () => {
    for (const listener of listeners) listener(state);
  });
}

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
  'day/[date]': DayScreen,
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

  it('logs yesterday by default and saves the picked color for it', async () => {
    const today = await setup({ partner: SAM });
    const yesterday = addDays(today, -1);
    await renderRouter(routes, { initialUrl: '/check-in' });

    expect(screen.getByText(formatLong(yesterday))).toBeTruthy();
    expect(screen.getByText('What was your lowest color yesterday?')).toBeTruthy();
    expect(screen.getByLabelText('Lowest color yesterday, best to lowest')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pick a color to save' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: /^Blue/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));

    await waitFor(() => expect(useAppStore.getState().days[yesterday]?.color).toBe(1));
    expect(useAppStore.getState().days[today]).toBeUndefined();
  });

  it('shows the grace note and the call label for a Red yesterday', async () => {
    await setup({ partner: SAM });
    await renderRouter(routes, { initialUrl: '/check-in' });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));

    // Installed 3 days ago: the Red leaves 1 day, and the run before it is 1 day too.
    expect(
      screen.getByText('Your counter goes back to 1 day. Your best streak becomes 1 day. Your other days stay.'),
    ).toBeTruthy();
    expect(screen.getByText("God's grace doesn't reset.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save, then call Sam' })).toBeTruthy();
  });

  it('goes straight to the call after a new Red for yesterday, before today’s call', async () => {
    const today = await setup({ partner: SAM });
    const view = await renderRouter(routes, { initialUrl: '/check-in' });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save, then call Sam' }));

    await waitFor(() => expect(view.getPathname()).toBe('/call'));
    expect(useAppStore.getState().days[addDays(today, -1)]?.color).toBe(3);
    expect(await screen.findByLabelText('Yesterday: Red')).toBeTruthy();
  });

  it('still logs today, without a call: today is told out loud', async () => {
    const today = await setup({ partner: SAM });
    const view = await renderRouter(routes, { initialUrl: `/check-in?date=${today}` });

    expect(screen.getByText('What was your lowest color today?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Today' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));
    // Installed 3 days ago: today no longer counts as clean, so best drops from 3 to 2.
    expect(
      screen.getByText('Your counter restarts at 0. Your best streak becomes 2 days. Your history stays.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
    expect(useAppStore.getState().days[today]?.color).toBe(3);
  });

  it('asks about earlier days as "that day" and shows the stored color', async () => {
    const today = await setup({}, [{ date: addDays(todayLocal(), -2), color: 2, checkedIn: false }]);
    await renderRouter(routes, { initialUrl: `/check-in?date=${addDays(today, -2)}` });

    expect(screen.getByText('What was your lowest color that day?')).toBeTruthy();
    expect(screen.getByLabelText('Lowest color that day, best to lowest')).toBeTruthy();
    expect(screen.getByText('Currently: Yellow')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
  });

  it('names the day in the confirmation for a better color', async () => {
    const alerts = spyOnAlerts();
    const today = await setup({}, [
      { date: todayLocal(), color: 2, checkedIn: false },
      { date: addDays(todayLocal(), -1), color: 2, checkedIn: false },
      { date: addDays(todayLocal(), -2), color: 2, checkedIn: false },
    ]);

    await renderRouter(routes, { initialUrl: `/check-in?date=${addDays(today, -1)}` });
    await fireEvent.press(screen.getByRole('radio', { name: /^Green/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));
    await waitFor(() => alerts.find('Yesterday is already Yellow'));

    await act(async () => router.navigate({ pathname: '/check-in', params: { date: addDays(today, -2) } }));
    await fireEvent.press(await screen.findByRole('radio', { name: /^Green/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));
    await waitFor(() => alerts.find('That day is already Yellow'));

    // Today can still be logged (History › day screen).
    await act(async () => router.navigate({ pathname: '/check-in', params: { date: today } }));
    await fireEvent.press(await screen.findByRole('radio', { name: /^Green/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));
    await waitFor(() => alerts.find('Today is already Yellow'));
  });

  it.each<[string, (today: string) => string, string]>([
    ['from Today', (today) => `/check-in?date=${addDays(today, -1)}&from=today`, 'Back to Today'],
    ['for today with no origin', (today) => `/check-in?date=${today}`, 'Back to Today'],
    ['for yesterday with no origin', (today) => `/check-in?date=${addDays(today, -1)}`, 'Go back'],
    ['by default (yesterday)', () => '/check-in', 'Go back'],
    ['from the call', (today) => `/check-in?date=${addDays(today, -1)}&from=call`, 'Go back'],
  ])('labels the back button when opened %s', async (_how, url, label) => {
    const today = await setup();
    await renderRouter(routes, { initialUrl: url(today) });
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
    expect(screen.getByText(label === 'Back to Today' ? 'Today' : 'Back')).toBeTruthy();
  });

  it('keeps the day it was opened for when midnight passes', async () => {
    mockToday = '2026-10-29';
    await setup({ partner: SAM });
    await renderRouter(routes, { initialUrl: '/check-in' });
    // Opened on 10-29 with no date: yesterday, 10-28.
    expect(screen.getByText(formatLong('2026-10-28'))).toBeTruthy();
    expect(screen.getByText('What was your lowest color yesterday?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));

    mockToday = '2026-10-30';
    await act(async () => useAppStore.getState().refreshToday());
    expect(useAppStore.getState().today).toBe('2026-10-30');
    expect(screen.getByText(formatLong('2026-10-28'))).toBeTruthy();
    expect(screen.getByText('What was your lowest color that day?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Save, then call Sam' }));
    await waitFor(() => expect(useAppStore.getState().days['2026-10-28']?.color).toBe(3));
    expect(useAppStore.getState().days['2026-10-29']).toBeUndefined();
    expect(useAppStore.getState().days['2026-10-30']).toBeUndefined();
  });

  it('starts over when reused for another day (new params while it is open)', async () => {
    const today = await setup({}, [{ date: addDays(todayLocal(), -2), color: 0, checkedIn: false }]);
    const view = await renderRouter(routes, { initialUrl: `/check-in?date=${addDays(today, -2)}` });
    // The stored Green is preselected.
    expect(screen.getByRole('radio', { name: /^Green/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save color' })).toBeEnabled();

    await act(async () =>
      router.navigate({ pathname: '/check-in', params: { date: addDays(today, -1) } }),
    );

    expect(await screen.findByText('What was your lowest color yesterday?')).toBeTruthy();
    expect(view.getRouterState()?.routes[0]?.state?.routes).toHaveLength(1); // same screen, new params
    expect(screen.getByRole('radio', { name: /^Green/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Pick a color to save' })).toBeDisabled();
  });

  it('keeps a past call when that day gets worse, without asking for another call', async () => {
    const alerts = spyOnAlerts();
    const yesterday = addDays(todayLocal(), -1);
    await setup({ partner: SAM }, [{ date: yesterday, color: 0, checkedIn: true }]);
    const view = await renderRouter(routes, { initialUrl: `/check-in?date=${yesterday}` });

    await fireEvent.press(screen.getByRole('radio', { name: /^Yellow/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
    expect(useAppStore.getState().days[yesterday]).toEqual({ date: yesterday, color: 2, checkedIn: true });
    expect(alerts.spy).not.toHaveBeenCalled();
  });

  it('goes to the call after a new Red on the last call day, before today’s call', async () => {
    // Yesterday's call only covered yesterday up to the call, so the next call covers it too.
    const yesterday = addDays(todayLocal(), -1);
    await setup({ partner: SAM }, [{ date: yesterday, color: 0, checkedIn: true }]);
    const view = await renderRouter(routes, { initialUrl: '/check-in' });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save, then call Sam' }));

    await waitFor(() => expect(view.getPathname()).toBe('/call'));
    expect(useAppStore.getState().days[yesterday]).toEqual({ date: yesterday, color: 3, checkedIn: true });
  });

  it('never offers a second call today: today stays checked in', async () => {
    const alerts = spyOnAlerts();
    const today = await setup({ partner: SAM }, [{ date: todayLocal(), color: null, checkedIn: true }]);
    const yesterday = addDays(today, -1);
    const view = await renderRouter(routes, { initialUrl: '/check-in' });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
    expect(useAppStore.getState().days[yesterday]).toEqual({ date: yesterday, color: 3, checkedIn: false });
    expect(useAppStore.getState().days[today]).toEqual({ date: today, color: null, checkedIn: true });
    expect(alerts.spy).not.toHaveBeenCalled();
  });

  it('says the counter counts from a past Red when there is no counter yet', async () => {
    const today = await setup({ partner: SAM, installDate: null });
    await renderRouter(routes, { initialUrl: `/check-in?date=${addDays(today, -5)}` });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));
    expect(
      screen.getByText(
        'Your counter now counts from that day: 5 days. Your best streak becomes 5 days. Your other days stay.',
      ),
    ).toBeTruthy();
  });

  it('says so when a Red before install moves the counter start back', async () => {
    const today = await setup({ partner: SAM }); // installed 3 days ago, no Reds
    await renderRouter(routes, { initialUrl: `/check-in?date=${addDays(today, -10)}` });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));
    expect(
      screen.getByText(
        'Your counter now counts from that day: 10 days. Your best streak becomes 10 days. Your other days stay.',
      ),
    ).toBeTruthy();
  });

  it('shows what a past Red does and saves it without a call the window would not cover', async () => {
    const today = await setup({ partner: SAM }, [
      { date: addDays(todayLocal(), -1), color: 0, checkedIn: true },
    ]);
    const twoDaysAgo = addDays(today, -2);
    const view = await renderRouter(routes, { initialUrl: `/check-in?date=${twoDaysAgo}` });

    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));
    // Installed 3 days ago: the Red leaves 2 days, and the 0-day run before it is shorter.
    expect(
      screen.getByText('Your counter goes back to 2 days. Your best streak becomes 2 days. Your other days stay.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
    expect(useAppStore.getState().days[twoDaysAgo]?.color).toBe(3);
  });
});

describe('call', () => {
  it('prompts to add a partner when there is none', async () => {
    await setup();
    await renderRouter(routes, { initialUrl: '/call' });
    expect(screen.getByText('Add your partner first')).toBeTruthy();
  });

  it('shows the window through yesterday, the script, and marks today as checked in', async () => {
    const today = await setup({ partner: SAM }, [
      { date: addDays(todayLocal(), -1), color: 1, checkedIn: false },
    ]);
    await renderRouter(routes, { initialUrl: '/call' });

    expect(screen.getByText('Call with Sam')).toBeTruthy();
    expect(
      screen.getByText('Share your lowest color since your last call and how today is going. Then Sam prays for you.'),
    ).toBeTruthy();
    expect(screen.getByText('Since you started')).toBeTruthy();
    // Installed 3 days ago: the first call covers install day through yesterday, never today.
    expect(screen.getByLabelText(`${formatShort(addDays(today, -3))}: not logged`)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Log the color for ${formatShort(addDays(today, -3))}` })).toBeTruthy();
    expect(screen.getByLabelText(`${formatShort(addDays(today, -2))}: not logged`)).toBeTruthy();
    expect(screen.getByLabelText('Yesterday: Blue')).toBeTruthy();
    expect(screen.queryByLabelText(/^Today: /)).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Log the color for / })).toHaveLength(2);
    expect(screen.getByLabelText('Lowest logged color: Blue')).toBeTruthy();

    expect(screen.getByLabelText('Step 1. Share: “Since I started, my lowest was Blue.”')).toBeTruthy();
    expect(screen.getByLabelText('Step 2. Tell Sam how today has gone so far.')).toBeTruthy();
    expect(screen.getByLabelText('Step 3. Sam prays for you.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /I talked with Sam/ }));
    await waitFor(() => expect(useAppStore.getState().days[today]?.checkedIn).toBe(true));
    expect(await screen.findByText('You already talked with Sam today.')).toBeTruthy();
    expect(screen.getByText('Tomorrow, log today’s color and share it on your next call.')).toBeTruthy();
    expect(screen.queryByText('On the call')).toBeNull();
    // Nothing about today is saved at call time.
    expect(useAppStore.getState().days[today]).toEqual({ date: today, color: null, checkedIn: true });
  });

  it('has nothing to share yet on install day', async () => {
    const today = await setup({ partner: SAM, installDate: todayLocal() });
    await renderRouter(routes, { initialUrl: '/call' });

    expect(screen.getByText('Nothing logged to share yet. Tell Sam how today has gone.')).toBeTruthy();
    expect(screen.getByText('Tell Sam how today is going. Then Sam prays for you.')).toBeTruthy();
    expect(screen.queryByText(/^Share your lowest color since your last call/)).toBeNull();
    expect(screen.queryByText('Since you started')).toBeNull();
    expect(screen.queryByText('No colors logged yet. Tap “Log it” to add one before you call.')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Log the color for / })).toBeNull();
    expect(screen.getByLabelText('Step 1. Share how you’ve been doing.')).toBeTruthy();
    expect(screen.getByLabelText('Step 2. Tell Sam how today has gone so far.')).toBeTruthy();
    expect(screen.getByLabelText('Step 3. Sam prays for you.')).toBeTruthy();
    expect(useAppStore.getState().settings.installDate).toBe(today);
  });

  it('asks to log the days first when none of them has a color', async () => {
    await setup({ partner: SAM });
    await renderRouter(routes, { initialUrl: '/call' });

    expect(screen.getByText('No colors logged yet. Tap “Log it” to add one before you call.')).toBeTruthy();
    expect(screen.getByLabelText('Yesterday: not logged')).toBeTruthy();
    expect(screen.getByLabelText('Step 1. Share how you’ve been doing.')).toBeTruthy();
  });

  it('asks how you’ve been since the last call when nothing since then has a color', async () => {
    await setup({ partner: SAM }, [{ date: addDays(todayLocal(), -1), color: null, checkedIn: true }]);
    await renderRouter(routes, { initialUrl: '/call' });

    expect(screen.getByText('Since your last call')).toBeTruthy();
    expect(screen.getByLabelText('Yesterday: not logged')).toBeTruthy();
    expect(screen.getByLabelText('Step 1. Share how you’ve been doing since your last call.')).toBeTruthy();
  });

  it('lists the last call day again: that call only covered it up to the call', async () => {
    const yesterday = addDays(todayLocal(), -1);
    await setup({ partner: SAM }, [
      { date: addDays(yesterday, -1), color: 3, checkedIn: false },
      { date: yesterday, color: 2, checkedIn: true },
    ]);
    await renderRouter(routes, { initialUrl: '/call' });

    expect(screen.getByText('Since your last call')).toBeTruthy();
    expect(screen.getByLabelText(`Last call ${formatShort(yesterday)}`)).toBeTruthy();
    expect(screen.getByLabelText('Yesterday: Yellow')).toBeTruthy();
    expect(screen.getByLabelText('Lowest since last call: Yellow')).toBeTruthy();
    expect(screen.getByLabelText('Step 1. Share: “Since our last call, my lowest was Yellow.”')).toBeTruthy();
    // Only the one day: the Red before the last call is not shared again.
    expect(screen.queryByLabelText(/Red$/)).toBeNull();
  });

  it('offers to log an unlogged window day and comes back to the call', async () => {
    const yesterday = addDays(todayLocal(), -1);
    await setup({ partner: SAM }, [{ date: yesterday, color: null, checkedIn: true }]);
    const view = await renderRouter(routes, { initialUrl: '/' });
    await act(async () => router.push('/call'));

    await fireEvent.press(await screen.findByRole('button', { name: `Log the color for ${formatShort(yesterday)}` }));
    expect(await screen.findByText('What was your lowest color yesterday?')).toBeTruthy();
    expect(view.getSearchParams()).toEqual({ date: yesterday, from: 'call' });
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: /^Green/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));
    await waitFor(() => expect(view.getPathname()).toBe('/call'));
    expect(await screen.findByLabelText('Yesterday: Green')).toBeTruthy();
  });

  /** Taps "Call Sam" and waits for the dial to finish. */
  async function tapCall() {
    await fireEvent.press(screen.getByRole('button', { name: 'Call Sam' }));
    await waitFor(() => expect(dialer.callPhone).toHaveBeenCalledWith('555 0100'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Call Sam' })).toBeEnabled());
  }

  /** Taps "Call Sam", leaves for the dialer, and comes back (on `returnOn`, if given). */
  async function callAndReturn(returnOn?: string) {
    await tapCall();
    await emitAppState('background');
    if (returnOn) mockToday = returnOn;
    await emitAppState('active');
  }

  it('credits a call that runs past midnight to the day it started', async () => {
    jest.clearAllMocks();
    mockToday = '2026-10-29';
    await setup({ partner: SAM });
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/call' });

    await callAndReturn('2026-10-30');

    expect(alerts.find('Did you talk with Sam?').message).toBe(
      `The call started on ${formatLong('2026-10-29')}, so it counts for that day.`,
    );
    await alerts.press('Did you talk with Sam?', 'Yes, we talked');
    await waitFor(() => expect(useAppStore.getState().days['2026-10-29']?.checkedIn).toBe(true));
    // The new day still gets its own call, which covers the call day (logged once it is over).
    expect(useAppStore.getState().days['2026-10-30']).toBeUndefined();
    expect(screen.queryByText('You already talked with Sam today.')).toBeNull();
    expect(await screen.findByText('Since your last call')).toBeTruthy();
    expect(screen.getByLabelText('Yesterday: not logged')).toBeTruthy();
  });

  it('marks today for a call on the same day', async () => {
    jest.clearAllMocks();
    const today = await setup({ partner: SAM });
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/call' });

    await callAndReturn();

    expect(alerts.find('Did you talk with Sam?').message).toBeUndefined();
    await alerts.press('Did you talk with Sam?', 'Yes, we talked');
    await waitFor(() => expect(useAppStore.getState().days[today]?.checkedIn).toBe(true));
    expect(useAppStore.getState().days[today]?.color).toBeNull();
  });

  /** Makes the next callPhone wait until the returned function is called. */
  function holdNextDial() {
    let finish: (opened: boolean) => void = () => undefined;
    jest.mocked(dialer.callPhone).mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    return (opened: boolean) => act(async () => finish(opened));
  }

  it('asks after an iOS call (confirmation, then the in-call screen)', async () => {
    jest.clearAllMocks();
    await setup({ partner: SAM });
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/call' });

    await tapCall();
    await emitAppState('inactive');
    await emitAppState('background');
    await emitAppState('active');

    expect(alerts.find('Did you talk with Sam?')).toBeTruthy();
  });

  it('does not ask when the iOS confirmation is cancelled, then or on a later app switch', async () => {
    jest.clearAllMocks();
    await setup({ partner: SAM });
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/call' });

    await tapCall();
    await emitAppState('inactive');
    await emitAppState('active');
    await emitAppState('background');
    await emitAppState('active');

    expect(alerts.spy).not.toHaveBeenCalled();
  });

  it('does not ask when the confirmation is cancelled before the dial resolves', async () => {
    jest.clearAllMocks();
    await setup({ partner: SAM });
    const finishDial = holdNextDial();
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/call' });

    await fireEvent.press(screen.getByRole('button', { name: 'Call Sam' }));
    await emitAppState('inactive');
    await emitAppState('active');
    await finishDial(true);
    await emitAppState('background');
    await emitAppState('active');

    expect(alerts.spy).not.toHaveBeenCalled();
  });

  it('asks when the app leaves for the call before the dial resolves', async () => {
    jest.clearAllMocks();
    await setup({ partner: SAM });
    const finishDial = holdNextDial();
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/call' });

    await fireEvent.press(screen.getByRole('button', { name: 'Call Sam' }));
    await emitAppState('background');
    await finishDial(true);
    await emitAppState('active');

    expect(alerts.find('Did you talk with Sam?')).toBeTruthy();
  });

  it('does not ask after the dialer fails to open', async () => {
    jest.clearAllMocks();
    await setup({ partner: SAM });
    jest.mocked(dialer.callPhone).mockResolvedValueOnce(false);
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/call' });

    await tapCall();
    expect(alerts.find("Couldn't start the call")).toBeTruthy();
    await emitAppState('background');
    await emitAppState('active');

    expect(() => alerts.find('Did you talk with Sam?')).toThrow();
  });

  it('closes the call before opening the partner editor', async () => {
    await setup();
    const view = await renderRouter(routes, { initialUrl: '/' });
    await act(async () => router.push('/call'));
    expect(await screen.findByText('Add your partner first')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add your partner' }));

    await waitFor(() => expect(view.getPathname()).toBe('/settings/partner'));
    // The root stack (under expo-router's '__root' container) no longer holds the call.
    const rootStack = view.getRouterState()?.routes[0]?.state;
    expect(rootStack?.routes.map((route) => route.name)).toEqual(['(tabs)/index', '(tabs)/settings']);
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

    await fireEvent.press(screen.getByRole('switch', { name: 'Remind me to call' }));
    await waitFor(() => expect(useAppStore.getState().settings.reminder.enabled).toBe(true));
    expect(notifications.scheduleDailyReminder).toHaveBeenCalledWith(21, 0);
    // The preview shows exactly what the reminder says.
    expect(
      await screen.findByLabelText(`Reminder preview at ${formatTime(21, 0)}: Daily reminder. Time for your daily call.`),
    ).toBeTruthy();
    expect(screen.getByText('Time for your daily call.')).toBeTruthy();
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

  it('counts an export as a backup only after the user confirms saving it', async () => {
    await setup();
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/settings' });
    expect(screen.getByText('No backup file exported yet.')).toBeTruthy();

    // Share sheet dismissed without saving.
    await fireEvent.press(screen.getByRole('button', { name: /Export backup file/ }));
    await waitFor(() => expect(backupFiles.shareBackupFile).toHaveBeenCalledTimes(1));
    expect(alerts.find('Did you save the backup file?').buttons.map((b) => b.text)).toEqual([
      'No',
      'Yes, I saved it',
    ]);
    expect(useAppStore.getState().settings.lastExportAt).toBeNull();

    // Saved this time.
    await fireEvent.press(screen.getByRole('button', { name: /Export backup file/ }));
    await waitFor(() => expect(backupFiles.shareBackupFile).toHaveBeenCalledTimes(2));
    await alerts.press('Did you save the backup file?', 'Yes, I saved it');
    await waitFor(() => expect(useAppStore.getState().settings.lastExportAt).not.toBeNull());
    expect(await screen.findByText(/^Last backup: /)).toBeTruthy();
  });

  /** Picks a backup whose reminder is on, confirms Replace, and returns the alert spy. */
  async function importReminderBackup() {
    const today = todayLocal();
    const backup = buildBackup(
      {
        days: [{ date: addDays(today, -1), color: 1, checkedIn: true }],
        behaviors: [],
        settings: {
          ...DEFAULT_SETTINGS,
          partner: SAM,
          reminder: { enabled: true, hour: 20, minute: 30 },
          installDate: addDays(today, -40),
          onboardingDone: true,
        },
      },
      new Date().toISOString(),
    );
    jest.mocked(backupFiles.pickBackupFile).mockResolvedValueOnce(JSON.parse(JSON.stringify(backup)));
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(screen.getByRole('button', { name: /Import backup file/ }));
    await waitFor(() => alerts.find('Replace your data?'));
    await alerts.press('Replace your data?', 'Replace');
    await waitFor(() => alerts.find('Backup restored'));
    return alerts;
  }

  it('asks for notification permission when a restored reminder is on', async () => {
    await setup();
    const alerts = await importReminderBackup();

    expect(notifications.requestPermission).toHaveBeenCalled();
    expect(notifications.reconcileReminder).toHaveBeenLastCalledWith({ enabled: true, hour: 20, minute: 30 });
    expect(useAppStore.getState().settings.reminder.enabled).toBe(true);
    expect(alerts.find('Backup restored').message).toBe('The data from your backup file is now on this phone.');
    // The restored file is itself the last backup.
    expect(useAppStore.getState().settings.lastExportAt).not.toBeNull();
  });

  it('turns a restored reminder off when notifications stay off', async () => {
    jest.mocked(notifications.getPermission).mockImplementation(async () => 'undetermined');
    jest.mocked(notifications.requestPermission).mockImplementation(async () => false);
    await setup();
    const alerts = await importReminderBackup();

    await waitFor(() => expect(useAppStore.getState().settings.reminder).toEqual({ enabled: false, hour: 20, minute: 30 }));
    expect(notifications.reconcileReminder).toHaveBeenLastCalledWith({ enabled: false, hour: 20, minute: 30 });
    expect(alerts.find('Backup restored').message).toContain('so the daily reminder is off');
    expect(screen.getByRole('switch', { name: 'Remind me to call' })).not.toBeChecked();
  });

  it('explains a reminder that is on but has never been allowed', async () => {
    jest.mocked(notifications.getPermission).mockImplementation(async () => 'undetermined');
    await setup({ reminder: { enabled: true, hour: 21, minute: 0 } });
    await renderRouter(routes, { initialUrl: '/settings' });

    expect(
      await screen.findByText('Your daily reminder needs permission to send notifications before it can arrive.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Allow notifications' }));
    await waitFor(() => expect(notifications.scheduleDailyReminder).toHaveBeenCalledWith(21, 0));
    expect(notifications.requestPermission).toHaveBeenCalled();
  });

  const DELETE_ALL_INTRO =
    "This deletes everything Light2Life keeps on this phone: every day's color and check-in, your color lists, your partner and your reminder. Your counter and best streak start over, and setup opens again.";

  it('deletes all data after a confirmation, then cancels the reminder and backup copies', async () => {
    const exportedAt = '2026-10-01T12:00:00.000Z';
    await setup(
      { partner: SAM, reminder: { enabled: true, hour: 20, minute: 30 }, lastExportAt: exportedAt },
      [{ date: addDays(todayLocal(), -1), color: 3, checkedIn: true }],
    );
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByRole('button', { name: /Delete all data/ }));
    const { message, buttons } = alerts.find('Delete all data?');
    expect(message).toBe(
      `${DELETE_ALL_INTRO}\n\nYour last backup file is from ${formatDateWithYear(toLocalDate(new Date(exportedAt)))}. This can't be undone.`,
    );
    expect(buttons.map((b) => [b.text, b.style])).toEqual([
      ['Cancel', 'cancel'],
      ['Delete all', 'destructive'],
    ]);
    expect(useAppStore.getState().settings.partner).toEqual(SAM);

    await alerts.press('Delete all data?', 'Delete all');
    await waitFor(() => expect(useAppStore.getState().settings).toEqual(DEFAULT_SETTINGS));
    expect(useAppStore.getState().days).toEqual({});
    await waitFor(() => expect(backupFiles.deleteBackupCopies).toHaveBeenCalledTimes(1));
    expect(notifications.cancelDailyReminder).toHaveBeenCalledTimes(1);
    expect(() => alerts.find('Your data was deleted')).toThrow();
  });

  it('says so when a backup copy could not be removed', async () => {
    await setup({ partner: SAM });
    jest.mocked(backupFiles.deleteBackupCopies).mockReturnValueOnce(false);
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByRole('button', { name: /Delete all data/ }));
    await alerts.press('Delete all data?', 'Delete all');

    await waitFor(() =>
      expect(alerts.find('Your data was deleted').message).toBe(
        "A backup copy in Light2Life's temporary folder couldn't be removed. Your phone clears that folder over time, and uninstalling Light2Life removes it right away.",
      ),
    );
    expect(useAppStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('still deletes the backup copies when cancelling the reminder fails', async () => {
    await setup({ partner: SAM, reminder: { enabled: true, hour: 20, minute: 30 } });
    jest.mocked(notifications.cancelDailyReminder).mockRejectedValueOnce(new Error('not allowed'));
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByRole('button', { name: /Delete all data/ }));
    await alerts.press('Delete all data?', 'Delete all');

    await waitFor(() => expect(backupFiles.deleteBackupCopies).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(() => alerts.find("Couldn't delete your data")).toThrow();
  });

  it('keeps everything when deleting fails', async () => {
    useAppStore.setState(pristine, true);
    const repo = createMemoryRepository({
      days: [],
      behaviors: [],
      settings: { ...DEFAULT_SETTINGS, partner: SAM, installDate: addDays(todayLocal(), -3), onboardingDone: true },
    });
    await useAppStore.getState().init({ ...repo, deleteAll: () => Promise.reject(new Error('disk full')) });
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByRole('button', { name: /Delete all data/ }));
    expect(alerts.find('Delete all data?').message).toBe(
      `${DELETE_ALL_INTRO}\n\nYou haven't exported a backup file. This can't be undone.`,
    );
    await alerts.press('Delete all data?', 'Delete all');
    await waitFor(() =>
      expect(alerts.find("Couldn't delete your data").message).toBe('Nothing was deleted. Please try again.'),
    );
    expect(useAppStore.getState().settings.partner).toEqual(SAM);
    expect(notifications.cancelDailyReminder).not.toHaveBeenCalled();
    expect(backupFiles.deleteBackupCopies).not.toHaveBeenCalled();
  });

  it('opens setup again after deleting all data', async () => {
    await setup({ partner: SAM });
    const alerts = spyOnAlerts();
    // The root layout's guard, without its database startup.
    function GuardedLayout() {
      const onboardingDone = useAppStore((s) => s.settings.onboardingDone);
      return (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={onboardingDone} redirectTo="/onboarding">
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={!onboardingDone} redirectTo="/">
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
      );
    }
    const view = await renderRouter(
      {
        ...routes,
        _layout: GuardedLayout,
        '(tabs)/_layout': TabsLayout,
        '(tabs)/history': () => <Text>History tab</Text>,
      },
      { initialUrl: '/settings' },
    );

    await fireEvent.press(screen.getByRole('button', { name: /Delete all data/ }));
    await alerts.press('Delete all data?', 'Delete all');

    expect(await screen.findByText('Welcome to Light2Life')).toBeTruthy();
    expect(view.getPathname()).toBe('/onboarding');
  });

  it('shows the disclaimer on About', async () => {
    await setup();
    await renderRouter(routes, { initialUrl: '/settings/about' });
    expect(
      screen.getByText(
        'Light2Life is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.',
      ),
    ).toBeTruthy();
  });

  it('opens the support page and privacy policy from About', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await setup();
    await renderRouter(routes, { initialUrl: '/settings/about' });
    await fireEvent.press(screen.getByText('Help and support'));
    expect(openURL).toHaveBeenCalledWith('https://turnonac.github.io/addiction-recovery-app/support.html');
    await fireEvent.press(screen.getByText('Privacy policy'));
    expect(openURL).toHaveBeenLastCalledWith(
      'https://turnonac.github.io/addiction-recovery-app/privacy.html',
    );
  });

  it('says so when a link on About cannot open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    const alerts = spyOnAlerts();
    await setup();
    await renderRouter(routes, { initialUrl: '/settings/about' });
    await fireEvent.press(screen.getByText('Help and support'));
    await waitFor(() =>
      expect(alerts.find("Couldn't open the link").message).toBe(
        'https://turnonac.github.io/addiction-recovery-app/support.html',
      ),
    );
  });
});

describe('today', () => {
  const todayRoutes = { ...routes, '(tabs)/index': TodayScreen };

  type Node = { readonly children: readonly (Node | string)[] };
  const textOf = (node: Node): string =>
    node.children.map((child) => (typeof child === 'string' ? child : textOf(child))).join('');
  /** Every header on screen (greeting, then card titles), top to bottom. */
  const headers = () => screen.getAllByRole('header').map(textOf);
  /** The hero's tiles and Best pill, in render order: call tile first, clean tile second. */
  const heroLabels = () =>
    screen
      .getAllByLabelText(/asked for prayer|first call|since last Red|counter starts|^Best streak/)
      .map((element) => element.props.accessibilityLabel as string);

  it('leads with the call total, then days since last Red and the best streak', async () => {
    await setup({ partner: SAM });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    // No call yet: a big 0 and an invite to make the first call.
    expect(screen.getByLabelText('0 calls. Make your first call')).toHaveTextContent(
      '0Make your first call',
    );
    expect(screen.getByLabelText('3 days since last Red')).toHaveTextContent('3days since last Red');
    expect(screen.getByLabelText('Best streak: 3 days')).toHaveTextContent('Best · 3 days');
    expect(heroLabels()).toEqual([
      '0 calls. Make your first call',
      '3 days since last Red',
      'Best streak: 3 days',
    ]);
    // The call tile is the accented one.
    expect(screen.getByLabelText('0 calls. Make your first call')).toHaveStyle({
      backgroundColor: lightTheme.accentSoft,
      borderColor: lightTheme.accent,
    });
  });

  // The hero row wraps on flexBasis, not on text size, so the basis grows with the text size.
  it.each([
    [1, 128], // two 128pt tiles + gap fit a phone's card: side by side
    [2, 256], // two of these don't fit: the tiles stack
  ])('gives the hero tiles a wider basis at text size %d×: %dpt', async (fontScale, basis) => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 812, scale: 3, fontScale });
    await setup({ partner: SAM });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByLabelText('0 calls. Make your first call')).toHaveStyle({ flexBasis: basis });
  });

  it('counts one call in the singular', async () => {
    await setup({ partner: SAM }, [{ date: addDays(todayLocal(), -1), color: 0, checkedIn: true }]);
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(
      screen.getByLabelText('You’ve shared your color and asked for prayer 1 day'),
    ).toHaveTextContent('1day you’ve shared your color and asked for prayer');
    expect(screen.queryByText('Make your first call')).toBeNull();
  });

  it('counts every call, backfilled days before install included', async () => {
    await setup({ partner: SAM }, [
      { date: addDays(todayLocal(), -6), color: 1, checkedIn: true },
      { date: addDays(todayLocal(), -2), color: 0, checkedIn: false },
      { date: addDays(todayLocal(), -1), color: 0, checkedIn: true },
      { date: todayLocal(), color: null, checkedIn: true },
    ]);
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(
      screen.getByLabelText('You’ve shared your color and asked for prayer 3 days'),
    ).toHaveTextContent('3days you’ve shared your color and asked for prayer');
    expect(heroLabels()).toEqual([
      'You’ve shared your color and asked for prayer 3 days',
      '3 days since last Red',
      'Best streak: 3 days',
    ]);
  });

  it('shows the call tile and Day 0 without a partner or install date', async () => {
    await setup({ installDate: null });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(heroLabels()).toEqual(['0 calls. Make your first call', 'Day 0. Your counter starts today.']);
    expect(screen.getByLabelText('Day 0. Your counter starts today.')).toHaveTextContent(
      'Day 0Your counter starts today',
    );
    expect(screen.queryByLabelText(/^Best streak/)).toBeNull();
  });

  it('says 1 day since last Red in the singular, Best included', async () => {
    await setup({ partner: SAM, installDate: addDays(todayLocal(), -1) });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByLabelText('1 day since last Red')).toHaveTextContent('1day since last Red');
    expect(screen.getByLabelText('Best streak: 1 day')).toHaveTextContent('Best · 1 day');
  });

  it('shows no Best pill on install day', async () => {
    await setup({ partner: SAM, installDate: todayLocal() });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByLabelText('0 days since last Red')).toHaveTextContent('0days since last Red');
    expect(screen.queryByLabelText(/^Best streak/)).toBeNull();
    expect(screen.getByLabelText('0 calls. Make your first call')).toBeTruthy();
  });

  it('puts the daily call first, then yesterday’s color, a missed day and the backup', async () => {
    const today = await setup({ partner: SAM, installDate: addDays(todayLocal(), -40) }, [
      { date: addDays(todayLocal(), -1), color: 0, checkedIn: false },
    ]);
    const view = await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(headers().slice(1)).toEqual([
      'Daily call with Sam',
      'Yesterday’s color',
      `${formatLong(addDays(today, -2)).split(',')[0]} isn’t logged`,
      'Back up your history',
    ]);
    // The call is the primary button.
    expect(screen.getByRole('button', { name: 'Call Sam' })).toHaveStyle({
      backgroundColor: lightTheme.accent,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Call Sam' }));
    await waitFor(() => expect(view.getPathname()).toBe('/call'));
    expect(await screen.findByText('Call with Sam')).toBeTruthy();
  });

  it('puts Add your partner before yesterday’s color without a partner', async () => {
    await setup();
    await renderRouter(todayRoutes, { initialUrl: '/' });

    const titles = headers();
    expect(titles.indexOf('Add your partner')).toBeGreaterThan(0);
    expect(titles.indexOf('Add your partner')).toBeLessThan(titles.indexOf('Yesterday’s color'));
    expect(screen.getByRole('button', { name: 'Add partner' })).toBeTruthy();
    expect(screen.queryByText(/^Daily call with/)).toBeNull();
  });

  it('asks for yesterday’s color and opens yesterday’s color log', async () => {
    const today = await setup({ partner: SAM });
    const yesterday = addDays(today, -1);
    const view = await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText('Yesterday’s color')).toBeTruthy();
    expect(screen.getByText('Not logged yet · pick your lowest color')).toBeTruthy();
    expect(screen.queryByText('Today’s color')).toBeNull();
    expect(screen.getByRole('button', { name: 'Log yesterday’s color' })).toHaveStyle({
      backgroundColor: lightTheme.surface2,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Log yesterday’s color' }));
    await waitFor(() => expect(view.getPathname()).toBe('/check-in'));
    expect(view.getSearchParams()).toEqual({ date: yesterday, from: 'today' });
    expect(await screen.findByText('What was your lowest color yesterday?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to Today' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: /^Blue/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));
    await waitFor(() => expect(view.getPathname()).toBe('/'));
    expect(await screen.findByLabelText('Yesterday: Blue')).toBeTruthy();
    expect(useAppStore.getState().days[today]).toBeUndefined();
  });

  it('shows yesterday’s logged color, and Update reopens it', async () => {
    const today = await setup({ partner: SAM }, [{ date: addDays(todayLocal(), -1), color: 2, checkedIn: false }]);
    const view = await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText('Your lowest color yesterday')).toBeTruthy();
    expect(screen.getByLabelText('Yesterday: Yellow')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log yesterday’s color' })).toBeNull();
    expect(screen.queryByText('Your counter restarted. God’s grace doesn’t reset.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Update yesterday’s color' })).toHaveStyle({
      backgroundColor: 'transparent',
      borderColor: lightTheme.muted,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Update yesterday’s color' }));
    await waitFor(() => expect(view.getPathname()).toBe('/check-in'));
    expect(view.getSearchParams()).toEqual({ date: addDays(today, -1), from: 'today' });
    expect(await screen.findByText('Currently: Yellow')).toBeTruthy();
  });

  it('says the counter restarted after a Red yesterday', async () => {
    await setup({ partner: SAM }, [{ date: addDays(todayLocal(), -1), color: 3, checkedIn: false }]);
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByLabelText('Yesterday: Red')).toBeTruthy();
    expect(screen.getByText('Your counter restarted. God’s grace doesn’t reset.')).toBeTruthy();
    expect(screen.getByLabelText('1 day since last Red')).toBeTruthy();
  });

  it('has nothing to log on install day', async () => {
    await setup({ partner: SAM, installDate: todayLocal() });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText('Yesterday’s color')).toBeTruthy();
    expect(screen.getByText('Tomorrow, log today’s color here.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log yesterday’s color' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Update yesterday’s color' })).toBeNull();
    expect(screen.queryByText(/isn’t logged$/)).toBeNull();
    expect(screen.getByText('No calls yet')).toBeTruthy();
  });

  it('keeps a Red yesterday from setup off the card on install day', async () => {
    await setup({ partner: SAM, installDate: todayLocal() }, [
      { date: addDays(todayLocal(), -1), color: 3, checkedIn: false },
    ]);
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText('Tomorrow, log today’s color here.')).toBeTruthy();
    expect(screen.queryByLabelText('Yesterday: Red')).toBeNull();
    expect(screen.queryByText('Your counter restarted. God’s grace doesn’t reset.')).toBeNull();
  });

  it('asks for yesterday’s color the day after install', async () => {
    await setup({ partner: SAM, installDate: addDays(todayLocal(), -1) });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText('Not logged yet · pick your lowest color')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log yesterday’s color' })).toBeTruthy();
    expect(screen.queryByText('Tomorrow, log today’s color here.')).toBeNull();
  });

  it('has nothing to log without an install date', async () => {
    await setup({ partner: SAM, installDate: null });
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText('Tomorrow, log today’s color here.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log yesterday’s color' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Update yesterday’s color' })).toBeNull();
  });

  it('offers the most recent missed day before yesterday', async () => {
    const today = await setup({ partner: SAM, installDate: addDays(todayLocal(), -5) }, [
      { date: addDays(todayLocal(), -2), color: 0, checkedIn: false },
      { date: addDays(todayLocal(), -1), color: 0, checkedIn: false },
    ]);
    // Unlogged: 5, 4 and 3 days ago. The card names the most recent one, by weekday.
    const missed = addDays(today, -3);
    const view = await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText(`${formatLong(missed).split(',')[0]} isn’t logged`)).toBeTruthy();
    expect(screen.getByText(`${formatLong(missed)} has no color yet. You can still make it up.`)).toBeTruthy();
    expect(screen.queryByText('Yesterday isn’t logged')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    await waitFor(() => expect(view.getPathname()).toBe('/check-in'));
    expect(view.getSearchParams()).toEqual({ date: missed });
    expect(await screen.findByText('What was your lowest color that day?')).toBeTruthy();
  });

  it('shows no missed-day card when only yesterday is unlogged', async () => {
    await setup({ partner: SAM }, [
      { date: addDays(todayLocal(), -3), color: 1, checkedIn: false },
      { date: addDays(todayLocal(), -2), color: 1, checkedIn: false },
    ]);
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByRole('button', { name: 'Log yesterday’s color' })).toBeTruthy();
    expect(screen.queryByText(/isn’t logged$/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Log it' })).toBeNull();
  });

  it('does not offer a missed day older than a week', async () => {
    const today = await setup(
      { partner: SAM, installDate: addDays(todayLocal(), -10) },
      [1, 2, 3, 4, 5, 6, 7].map((n) => ({ date: addDays(todayLocal(), -n), color: 0 as const, checkedIn: false })),
    );
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(useAppStore.getState().days[addDays(today, -8)]).toBeUndefined();
    expect(screen.queryByText(/isn’t logged$/)).toBeNull();
  });

  it('sums up the next call, which covers the last call day', async () => {
    await setup({ partner: SAM }, [{ date: addDays(todayLocal(), -1), color: 2, checkedIn: true }]);
    await renderRouter(todayRoutes, { initialUrl: '/' });

    expect(screen.getByText('Last call yesterday · lowest since then: Yellow')).toBeTruthy();
  });
});

describe('reminder tap', () => {
  it('opens the call screen, after refreshing today', async () => {
    mockToday = '2026-10-29';
    await setup({ partner: SAM });
    let tap: (() => void) | undefined;
    jest.mocked(notifications.addReminderTapListener).mockImplementation((onTap) => {
      tap = onTap;
      return () => undefined;
    });
    const view = await renderRouter(
      {
        ...routes,
        _layout: { default: RootLayout, unstable_settings: rootSettings },
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': TodayScreen,
        '(tabs)/history': () => <Text>History tab</Text>,
      },
      { initialUrl: '/' },
    );
    expect(await screen.findByText('Yesterday’s color')).toBeTruthy();
    await waitFor(() => expect(tap).toBeDefined());

    // Tapped after midnight: the call covers through the day that just ended.
    mockToday = '2026-10-30';
    await act(async () => tap?.());

    await waitFor(() => expect(view.getPathname()).toBe('/call'));
    expect(useAppStore.getState().today).toBe('2026-10-30');
    expect(await screen.findByText('Call with Sam')).toBeTruthy();
    expect(screen.getByLabelText('Yesterday: not logged')).toBeTruthy();
    expect(screen.queryByText('What was your lowest color yesterday?')).toBeNull();
  });

  /** Names of the root stack's routes, bottom to top. */
  function rootStack(view: { getRouterState(): unknown }): string[] {
    type State = { routes: { name: string; state?: State }[] };
    const root = view.getRouterState() as State | undefined;
    return root?.routes[0]?.state?.routes.map((route) => route.name) ?? [];
  }

  it.each<[string, (yesterday: string) => (string | { pathname: '/check-in'; params: Record<string, string> })[]]>([
    ['a color log opened from the call', (yesterday) => ['/call', { pathname: '/check-in', params: { date: yesterday, from: 'call' } }]],
    ['a color log opened from Today', (yesterday) => [{ pathname: '/check-in', params: { date: yesterday, from: 'today' } }]],
    ['the call', () => ['/call']],
  ])('closes %s first, so only one call is open', async (_open, hrefs) => {
    await setup({ partner: SAM });
    let tap: (() => void) | undefined;
    jest.mocked(notifications.addReminderTapListener).mockImplementation((onTap) => {
      tap = onTap;
      return () => undefined;
    });
    const view = await renderRouter(
      {
        ...routes,
        _layout: { default: RootLayout, unstable_settings: rootSettings },
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': TodayScreen,
        '(tabs)/history': () => <Text>History tab</Text>,
      },
      { initialUrl: '/' },
    );
    await waitFor(() => expect(tap).toBeDefined());
    for (const href of hrefs(addDays(todayLocal(), -1))) {
      await act(async () => router.push(href));
    }
    await waitFor(() => expect(rootStack(view)).toHaveLength(hrefs('').length + 1));

    await act(async () => tap?.());

    await waitFor(() => expect(rootStack(view)).toEqual(['(tabs)', 'call']));
    expect(view.getPathname()).toBe('/call');
    expect(await screen.findByText('Call with Sam')).toBeTruthy();
  });

  it('keeps the tab’s own screens when no modal is open', async () => {
    await setup({ partner: SAM });
    let tap: (() => void) | undefined;
    jest.mocked(notifications.addReminderTapListener).mockImplementation((onTap) => {
      tap = onTap;
      return () => undefined;
    });
    const view = await renderRouter(
      {
        ...routes,
        _layout: { default: RootLayout, unstable_settings: rootSettings },
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': TodayScreen,
        '(tabs)/history': () => <Text>History tab</Text>,
      },
      { initialUrl: '/settings/colors' },
    );
    await waitFor(() => expect(tap).toBeDefined());

    await act(async () => tap?.());

    await waitFor(() => expect(rootStack(view)).toEqual(['(tabs)', 'call']));
    await act(async () => router.back());
    await waitFor(() => expect(view.getPathname()).toBe('/settings/colors'));
  });
});

describe('day', () => {
  it('clears a logged day after confirming, so it is not logged again', async () => {
    const alerts = spyOnAlerts();
    const yesterday = addDays(todayLocal(), -1);
    await setup({ partner: SAM }, [{ date: yesterday, color: 3, checkedIn: true }]);
    await renderRouter(routes, { initialUrl: `/day/${yesterday}` });

    await fireEvent.press(screen.getByRole('button', { name: `Clear ${formatLong(yesterday)}` }));
    const { message } = alerts.find('Clear this day?');
    // Installed 3 days ago: without yesterday's Red, the counter runs from install.
    expect(message).toBe(
      'This removes its color (Red) and your check-in with Sam. The day goes back to not logged. ' +
        'Your counter becomes 3 days. Your best streak becomes 3 days.',
    );
    expect(useAppStore.getState().days[yesterday]).toBeDefined();

    await alerts.press('Clear this day?', 'Clear day');
    await waitFor(() => expect(useAppStore.getState().days[yesterday]).toBeUndefined());
    expect(screen.getByText('Not logged')).toBeTruthy();
    expect(screen.getByRole('button', { name: `Log a color for ${formatLong(yesterday)}` })).toBeTruthy();
    expect(screen.queryByRole('button', { name: `Clear ${formatLong(yesterday)}` })).toBeNull();
  });

  it('keeps the day when the clear is cancelled', async () => {
    const alerts = spyOnAlerts();
    const today = await setup({}, [{ date: todayLocal(), color: 1, checkedIn: false }]);
    await renderRouter(routes, { initialUrl: `/day/${today}` });

    await fireEvent.press(screen.getByRole('button', { name: `Clear ${formatLong(today)}` }));
    expect(alerts.find('Clear this day?').message).toBe(
      'This removes its color (Blue). The day goes back to not logged.',
    );
    const cancel = alerts.find('Clear this day?').buttons.find((b) => b.text === 'Cancel');
    expect(cancel?.style).toBe('cancel');
    expect(cancel?.onPress).toBeUndefined();
    expect(useAppStore.getState().days[today]).toEqual({ date: today, color: 1, checkedIn: false });
  });

  it('offers no clear for an unlogged day', async () => {
    const yesterday = addDays(todayLocal(), -1);
    await setup();
    await renderRouter(routes, { initialUrl: `/day/${yesterday}` });

    expect(screen.getByText('Not logged')).toBeTruthy();
    expect(screen.queryByRole('button', { name: `Clear ${formatLong(yesterday)}` })).toBeNull();
  });

  it('says so when the clear fails, and keeps the day', async () => {
    const alerts = spyOnAlerts();
    const yesterday = addDays(todayLocal(), -1);
    await setup({}, [{ date: yesterday, color: 2, checkedIn: false }]);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useAppStore.setState({ clearDay: () => Promise.reject(new Error('disk full')) });
    await renderRouter(routes, { initialUrl: `/day/${yesterday}` });

    await fireEvent.press(screen.getByRole('button', { name: `Clear ${formatLong(yesterday)}` }));
    await alerts.press('Clear this day?', 'Clear day');
    await waitFor(() => expect(alerts.spy).toHaveBeenCalledWith('Couldn’t clear the day', 'Please try again.'));
    expect(useAppStore.getState().days[yesterday]?.color).toBe(2);
    expect(screen.getByRole('button', { name: `Clear ${formatLong(yesterday)}` })).toBeEnabled();
  });
});

describe('tabs', () => {
  const tabRoutes = {
    _layout: () => <Stack screenOptions={{ headerShown: false }} />,
    '(tabs)/_layout': TabsLayout,
    '(tabs)/index': () => <Text>Today tab</Text>,
    '(tabs)/history': () => <Text>History tab</Text>,
    '(tabs)/settings/_layout': { default: SettingsLayout, unstable_settings },
    '(tabs)/settings/index': SettingsScreen,
    '(tabs)/settings/partner': PartnerScreen,
    '(tabs)/settings/about': AboutScreen,
  };

  /** Route names in the Settings tab's stack. */
  function settingsStack(view: Awaited<ReturnType<typeof renderRouter>>): string[] | undefined {
    const root = view.getRouterState()?.routes[0]?.state;
    const tabs = root?.routes.find((route) => route.name === '(tabs)')?.state;
    const settings = tabs?.routes.find((route) => route.name === 'settings')?.state;
    return settings?.routes.map((route) => route.name);
  }

  it('leaving Settings resets its stack, so links from Today never stack on an old page', async () => {
    await setup();
    const view = await renderRouter(tabRoutes, { initialUrl: '/settings/about' });
    expect(settingsStack(view)).toEqual(['index', 'about']);

    await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => expect(settingsStack(view)).toEqual(['index']));

    // Today's "Add partner" link: Save → back now lands on Settings, not About.
    await act(async () => router.navigate('/settings/partner', { withAnchor: true }));
    await waitFor(() => expect(view.getPathname()).toBe('/settings/partner'));
    expect(settingsStack(view)).toEqual(['index', 'partner']);
  });
});

describe('onboarding', () => {
  it('walks through every step, saving as it goes', async () => {
    const today = await setup({ onboardingDone: false, installDate: null });
    const view = await renderRouter(routes, { initialUrl: '/onboarding' });

    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    expect(
      await screen.findByText(
        'Each day, log your lowest color from the day before. Here are the colors and what they mean:',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Missed a day? You can fill it in later.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Who can you call each day?')).toBeTruthy();
    expect(screen.getByText('Step 3 of 6 · The most important step')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a friend later' }));

    expect(await screen.findByText('Do you remember the last time you went red?')).toBeTruthy();
    expect(screen.getByText('Step 4 of 6')).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Count streaks from today Your clean day streaks will start counting today.' }),
    ).toBeChecked();
    expect(screen.getByRole('radio', { name: 'The last day I went red was… Pick the date' })).not.toBeChecked();
    expect(screen.getByLabelText('Days since last Red: 0')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('What does Green look like for you?')).toBeTruthy();
    expect(useAppStore.getState().days).toEqual({}); // "Count streaks from today" logs no Red day
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('What does Blue look like for you?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Write examples later' }));

    expect(await screen.findByText('A daily reminder')).toBeTruthy();
    expect(
      screen.getByText('One reminder each day to make your call. You can change the time or turn it off any time in Settings.'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`Reminder preview at ${formatTime(21, 0)}: Daily reminder. Time for your daily call.`),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'No reminders for now' }));

    expect(await screen.findByText("You're all set")).toBeTruthy();
    // Summary order: partner, then days since last Red, then the reminder.
    expect(
      screen
        .getAllByText(/^(No partner yet|You'll call|Days? since last Red|No daily reminder|Daily reminder at)/)
        .map((line) => line.props.children),
    ).toEqual([
      'No partner yet. Today will remind you to add one.',
      'Days since last Red: 0',
      'No daily reminder. You can turn it on in Settings.',
    ]);
    expect(
      screen.getByText(
        'Call your partner each day: share your color and ask for prayer. Small honest steps, one day at a time.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(useAppStore.getState().settings.onboardingDone).toBe(true));
    expect(useAppStore.getState().settings.installDate).toBe(today);
    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });

  /** Taps through steps 1-5 with the defaults and skips, landing on the reminder step. */
  async function goToReminderStep() {
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add a friend later' }));
    expect(await screen.findByText('Do you remember the last time you went red?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Write examples later' }));
    expect(await screen.findByText('A daily reminder')).toBeTruthy();
  }

  it('goes back through the steps in order: counter → partner, color lists → counter', async () => {
    await setup({ onboardingDone: false, installDate: null });
    await renderRouter(routes, { initialUrl: '/onboarding' });
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add a friend later' }));
    expect(await screen.findByText('Do you remember the last time you went red?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Previous step' }));
    expect(await screen.findByText('Who can you call each day?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous step' }));
    expect(await screen.findByText('How colors work')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add a friend later' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('What does Green look like for you?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous step' }));
    expect(await screen.findByText('Do you remember the last time you went red?')).toBeTruthy();
  });

  it('names the saved partner on the last page, before days since last Red', async () => {
    await setup({ onboardingDone: false, installDate: null, partner: SAM });
    await renderRouter(routes, { initialUrl: '/onboarding' });
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Who can you call each day?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' })); // Sam is already saved
    expect(await screen.findByText('Do you remember the last time you went red?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Write examples later' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'No reminders for now' }));

    expect(await screen.findByText("You're all set")).toBeTruthy();
    expect(
      screen
        .getAllByText(/^(No partner yet|You'll call|Days? since last Red|No daily reminder|Daily reminder at)/)
        .map((line) => line.props.children),
    ).toEqual([
      "You'll call Sam each day",
      'Days since last Red: 0',
      'No daily reminder. You can turn it on in Settings.',
    ]);
    expect(
      screen.getByText('Call Sam each day: share your color and ask for prayer. Small honest steps, one day at a time.'),
    ).toBeTruthy();
  });

  it('says “Day since last Red: 1” when the last Red day was yesterday', async () => {
    await setup({ onboardingDone: false, installDate: null }, [
      { date: addDays(todayLocal(), -1), color: 3, checkedIn: false },
    ]);
    await renderRouter(routes, { initialUrl: '/onboarding' });
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add a friend later' }));
    expect(await screen.findByLabelText('Day since last Red: 1')).toHaveTextContent(/Day since last Red/);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Write examples later' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'No reminders for now' }));

    expect(await screen.findByText("You're all set")).toBeTruthy();
    expect(screen.getByText('Day since last Red: 1')).toBeTruthy();
  });

  it('cancels the scheduled reminder when the user goes back and opts out', async () => {
    jest.clearAllMocks();
    await setup({ onboardingDone: false, installDate: null });
    await renderRouter(routes, { initialUrl: '/onboarding' });
    await goToReminderStep();

    const nine = formatTime(21, 0); // locale-dependent, e.g. '9:00 PM'
    await fireEvent.press(await screen.findByRole('button', { name: `Remind me at ${nine}` }));
    expect(await screen.findByText(`Daily reminder at ${nine}`)).toBeTruthy();
    expect(notifications.scheduleDailyReminder).toHaveBeenCalledWith(21, 0);

    await fireEvent.press(screen.getByRole('button', { name: 'Previous step' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'No reminders for now' }));

    expect(await screen.findByText('No daily reminder. You can turn it on in Settings.')).toBeTruthy();
    expect(notifications.cancelDailyReminder).toHaveBeenCalled();
    expect(useAppStore.getState().settings.reminder.enabled).toBe(false);
  });

  it('says so when notifications are not allowed, and OK moves on with the reminder off', async () => {
    jest.clearAllMocks();
    jest.mocked(notifications.requestPermission).mockImplementation(async () => false);
    await setup({ onboardingDone: false, installDate: null });
    const alerts = spyOnAlerts();
    await renderRouter(routes, { initialUrl: '/onboarding' });
    await goToReminderStep();

    await fireEvent.press(screen.getByRole('button', { name: `Remind me at ${formatTime(21, 0)}` }));
    await waitFor(() => alerts.find('Did not turn on reminders'));
    const refused = alerts.find('Did not turn on reminders');
    expect(refused.message).toBe('The option to turn on reminders is available in Settings.');
    expect(refused.buttons.map((b) => b.text)).toEqual(['OK']);
    expect(notifications.scheduleDailyReminder).not.toHaveBeenCalled();
    expect(notifications.cancelDailyReminder).toHaveBeenCalled();
    expect(useAppStore.getState().settings.reminder.enabled).toBe(false);
    expect(screen.getByText('A daily reminder')).toBeTruthy(); // stays until OK

    await alerts.press('Did not turn on reminders', 'OK');
    expect(await screen.findByText("You're all set")).toBeTruthy();
    expect(screen.getByText('No daily reminder. You can turn it on in Settings.')).toBeTruthy();
  });
});
