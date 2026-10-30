/**
 * Smoke tests for the Settings, check-in, call and onboarding routes, rendered
 * through expo-router's testing library with the in-memory repository.
 * Native services are mocked; the store and domain rules are real.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, AppState, Text, type AlertButton, type AppStateStatus } from 'react-native';

import TabsLayout from '@/app/(tabs)/_layout';
import SettingsLayout, { unstable_settings } from '@/app/(tabs)/settings/_layout';
import AboutScreen from '@/app/(tabs)/settings/about';
import ColorsScreen from '@/app/(tabs)/settings/colors';
import SettingsScreen from '@/app/(tabs)/settings/index';
import PartnerScreen from '@/app/(tabs)/settings/partner';
import CallScreen from '@/app/call';
import CheckInScreen from '@/app/check-in';
import OnboardingScreen from '@/app/onboarding';
import { createMemoryRepository } from '@/data/memoryRepository';
import { buildBackup } from '@/domain/backup';
import type * as Dates from '@/domain/dates';
import { addDays, formatLong, todayLocal } from '@/domain/dates';
import { DEFAULT_SETTINGS, type DayLog, type Settings } from '@/domain/types';
import { formatTime } from '@/features/onboarding/pickers';
import * as backupFiles from '@/services/backupFiles';
import * as dialer from '@/services/dialer';
import * as notifications from '@/services/notifications';
import { useAppStore } from '@/state/store';

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

afterEach(() => {
  mockToday = null;
  jest.restoreAllMocks();
  jest.mocked(notifications.getPermission).mockImplementation(async () => 'granted');
  jest.mocked(notifications.requestPermission).mockImplementation(async () => true);
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

  it('keeps the day it was opened for when midnight passes', async () => {
    mockToday = '2026-10-29';
    await setup({ partner: SAM });
    await renderRouter(routes, { initialUrl: '/check-in' });
    expect(screen.getByText(formatLong('2026-10-29'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: /^Red/ }));

    mockToday = '2026-10-30';
    await act(async () => useAppStore.getState().refreshToday());
    expect(useAppStore.getState().today).toBe('2026-10-30');
    expect(screen.getByText(formatLong('2026-10-29'))).toBeTruthy();
    expect(screen.getByText('What was your lowest color that day?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Save, then call Sam' }));
    await waitFor(() => expect(useAppStore.getState().days['2026-10-29']?.color).toBe(3));
    expect(useAppStore.getState().days['2026-10-30']).toBeUndefined();
  });

  it('starts over when reused for another day (reminder tap over an open check-in)', async () => {
    const today = await setup({}, [{ date: addDays(todayLocal(), -1), color: 0, checkedIn: false }]);
    const view = await renderRouter(routes, { initialUrl: `/check-in?date=${addDays(today, -1)}` });
    // Yesterday's stored Green is preselected.
    expect(screen.getByRole('radio', { name: /^Green/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save check-in' })).toBeEnabled();

    await act(async () => router.navigate({ pathname: '/check-in', params: { date: today } }));

    expect(await screen.findByText('What was your lowest color today?')).toBeTruthy();
    expect(view.getRouterState()?.routes[0]?.state?.routes).toHaveLength(1); // same screen, new params
    expect(screen.getByRole('radio', { name: /^Green/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Pick a color to save' })).toBeDisabled();
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
    // The new day keeps its own window: its color is shared on its own call.
    expect(useAppStore.getState().days['2026-10-30']).toBeUndefined();
    expect(screen.queryByText('You already talked with Sam today.')).toBeNull();
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
          counterStartDate: addDays(today, -40),
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
    expect(screen.getByRole('switch', { name: 'Remind me to check in' })).not.toBeChecked();
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

  it('shows the disclaimer on About', async () => {
    await setup();
    await renderRouter(routes, { initialUrl: '/settings/about' });
    expect(
      screen.getByText(
        'Light2Life is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.',
      ),
    ).toBeTruthy();
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

  it('cancels the scheduled reminder when the user goes back and opts out', async () => {
    jest.clearAllMocks();
    await setup({ onboardingDone: false, installDate: null, counterStartDate: null });
    await renderRouter(routes, { initialUrl: '/onboarding' });

    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Skip for now · Today will remind you' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Write these later' }));

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
});
