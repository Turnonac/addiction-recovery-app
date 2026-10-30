import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  presentContactPickerAsync,
  type Contact,
  type ExistingContact,
  type PhoneNumber,
} from 'expo-contacts/legacy';
import { Alert, Platform, type AlertButton } from 'react-native';

import { pickPartnerContact } from '@/services/contacts';

import ContactPicker from '../../../modules/contact-picker';

jest.mock('expo-contacts/legacy', () => ({ presentContactPickerAsync: jest.fn() }));
jest.mock('../../../modules/contact-picker', () => ({
  __esModule: true,
  default: { pickPhone: jest.fn() },
}));

const presentPicker = jest.mocked(presentContactPickerAsync);
const pickPhone = jest.mocked(ContactPicker!.pickPhone);

/** The iOS picker result: no formatted `name`, labels already localized by iOS. */
function picked(fields: Partial<Contact>) {
  presentPicker.mockResolvedValueOnce({ id: '1', ...fields } as unknown as ExistingContact);
}

function phone(label: string, number: string): PhoneNumber {
  return { label, number };
}

/** Records Alert.alert calls; `press` taps the button with that text in the last alert. */
function spyOnAlerts() {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const last = () => spy.mock.calls[spy.mock.calls.length - 1];
  return {
    spy,
    title: () => last()?.[0],
    buttons: () => (last()?.[2] ?? []).map((b: AlertButton) => b.text),
    press: (text: string) => {
      const button = (last()?.[2] ?? []).find((b: AlertButton) => b.text === text);
      if (!button) throw new Error(`No button "${text}"`);
      button.onPress?.();
    },
  };
}

/** Lets the picker promise settle so the number alert is up. */
const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('pickPartnerContact on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('uses the only number without asking', async () => {
    const alerts = spyOnAlerts();
    picked({ firstName: 'James', lastName: 'Cole', phoneNumbers: [phone('home', '555 0100')] });
    await expect(pickPartnerContact()).resolves.toEqual({
      status: 'picked',
      partner: { name: 'James Cole', phone: '555 0100' },
    });
    expect(alerts.spy).not.toHaveBeenCalled();
  });

  it('asks which number, mobile first, when the contact has several', async () => {
    const alerts = spyOnAlerts();
    picked({
      firstName: 'James',
      phoneNumbers: [
        phone('home', '(555) 010-0100'),
        phone('mobile', '+1 555 010 0200'),
        phone('_$!<Pager>!$_', '555 0300'),
      ],
    });
    const result = pickPartnerContact();
    await flush();
    expect(alerts.title()).toBe('Which number for James?');
    expect(alerts.buttons()).toEqual([
      'mobile: +1 555 010 0200',
      'home: (555) 010-0100',
      'Pager: 555 0300',
      'Cancel',
    ]);
    alerts.press('home: (555) 010-0100');
    await expect(result).resolves.toEqual({
      status: 'picked',
      partner: { name: 'James', phone: '(555) 010-0100' },
    });
  });

  it('treats cancelling the number choice like backing out of the picker', async () => {
    const alerts = spyOnAlerts();
    picked({
      firstName: 'James',
      phoneNumbers: [phone('home', '555 0100'), phone('iPhone', '555 0200')],
    });
    const result = pickPartnerContact();
    await flush();
    alerts.press('Cancel');
    await expect(result).resolves.toEqual({ status: 'cancelled' });
  });

  it('ignores a second pick while the number choice is open', async () => {
    const alerts = spyOnAlerts();
    picked({ firstName: 'James', phoneNumbers: [phone('home', '1'), phone('work', '2')] });
    const first = pickPartnerContact();
    await flush();
    await expect(pickPartnerContact()).resolves.toEqual({ status: 'cancelled' });
    alerts.press('work: 2');
    await expect(first).resolves.toMatchObject({ partner: { phone: '2' } });
  });

  it('does not ask when the other numbers are the same text or blank', async () => {
    const alerts = spyOnAlerts();
    picked({
      firstName: 'James',
      phoneNumbers: [phone('home', '555 0100'), phone('mobile', ' 555 0100 '), phone('other', '  ')],
    });
    await expect(pickPartnerContact()).resolves.toEqual({
      status: 'picked',
      partner: { name: 'James', phone: '555 0100' },
    });
    expect(alerts.spy).not.toHaveBeenCalled();
  });

  it('asks between numbers written differently, and keeps the chosen one as written', async () => {
    const alerts = spyOnAlerts();
    picked({
      firstName: 'James',
      phoneNumbers: [phone('home', '555-0100'), phone('mobile', '(555) 0100')],
    });
    const result = pickPartnerContact();
    await flush();
    alerts.press('home: 555-0100');
    await expect(result).resolves.toEqual({
      status: 'picked',
      partner: { name: 'James', phone: '555-0100' },
    });
  });

  it('returns a contact without a number with phone empty', async () => {
    picked({ firstName: 'James' });
    await expect(pickPartnerContact()).resolves.toEqual({
      status: 'picked',
      partner: { name: 'James', phone: '' },
    });
  });

  it('resolves cancelled when the user backs out of the picker', async () => {
    presentPicker.mockResolvedValueOnce(null);
    await expect(pickPartnerContact()).resolves.toEqual({ status: 'cancelled' });
  });

  it('resolves unavailable when the picker throws', async () => {
    presentPicker.mockRejectedValueOnce(new Error('Picker unavailable'));
    await expect(pickPartnerContact()).resolves.toEqual({ status: 'unavailable' });
  });

  it.each([
    [{ firstName: 'Mary', middleName: 'Ann', lastName: 'Lee' }, 'Mary Ann Lee'],
    [{ firstName: '太郎', lastName: '山田' }, '山田太郎'],
    [{ firstName: '길동', lastName: '홍' }, '홍길동'],
    [{ firstName: '小明', lastName: '王' }, '王小明'],
    [{ firstName: 'John', lastName: '李' }, 'John 李'],
    [{ nickname: 'Jimmy', company: 'Acme' }, 'Jimmy'],
    [{ company: 'Acme' }, 'Acme'],
  ])('names %o as %s', async (fields, name) => {
    picked({ ...fields, phoneNumbers: [phone('mobile', '555 0100')] });
    await expect(pickPartnerContact()).resolves.toMatchObject({ partner: { name } });
  });
});

describe('pickPartnerContact on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('uses the local picker module and never expo-contacts or an alert', async () => {
    const alerts = spyOnAlerts();
    pickPhone.mockResolvedValueOnce({ name: ' James Cole ', phone: ' 555 0100 ' });
    await expect(pickPartnerContact()).resolves.toEqual({
      status: 'picked',
      partner: { name: 'James Cole', phone: '555 0100' },
    });
    expect(presentPicker).not.toHaveBeenCalled();
    expect(alerts.spy).not.toHaveBeenCalled();
  });

  it('resolves cancelled when the user backs out', async () => {
    pickPhone.mockResolvedValueOnce(null);
    await expect(pickPartnerContact()).resolves.toEqual({ status: 'cancelled' });
  });
});
