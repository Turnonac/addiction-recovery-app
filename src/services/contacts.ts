/**
 * Pick the partner from the phone's contacts without asking for contacts permission.
 *
 * iOS: CNContactPickerViewController via `expo-contacts/legacy` `presentContactPickerAsync`
 *      (runs out of process, no permission prompt). It returns the whole contact, so when
 *      the contact has several numbers the user chooses one in an alert.
 * Android: local module `modules/contact-picker` (Intent.ACTION_PICK on phone numbers,
 *      temporary read grant). READ_CONTACTS is blocked in app.json, so expo-contacts is
 *      never used on Android.
 */
import { presentContactPickerAsync, type Contact, type PhoneNumber } from 'expo-contacts/legacy';
import { Alert, Platform } from 'react-native';

import type { Partner } from '@/domain/types';
import { sanitizePhone } from '@/services/dialer';

import ContactPicker from '../../modules/contact-picker';

export type PickPartnerResult =
  | { status: 'picked'; partner: Partner }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

const CANCELLED: PickPartnerResult = { status: 'cancelled' };
const UNAVAILABLE: PickPartnerResult = { status: 'unavailable' };

let picking = false;

/** Han (and 々), kana and Hangul: scripts whose names put the family name first. */
const CJK =
  /[\u1100-\u11FF\u3005\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF66-\uFF9F]/;

/** The iOS picker gives no formatted name (`name` is unset), only the parts. */
function displayName(contact: Contact): string {
  const full = contact.name?.trim();
  if (full) return full;
  const parts = [contact.firstName, contact.middleName, contact.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length === 0) return contact.nickname?.trim() || contact.company?.trim() || '';
  // CJK names go family name first with no space (山田太郎, 홍길동); others given name first.
  if (parts.every((part) => CJK.test(part))) return parts.reverse().join('');
  return parts.join(' ');
}

/**
 * iOS sends labels already localized ("mobile", "home", a custom label); an unknown
 * system label keeps its "_$!<Label>!$_" form, so that wrapper is dropped.
 */
function phoneLabel(phone: PhoneNumber): string {
  return (phone.label ?? '').trim().replace(/^_\$!<(.*)>!\$_$/, '$1');
}

// Labels are localized: matches "mobile", "iPhone", "cell" (and e.g. German "Mobil").
const MOBILE_LABEL = /mobil|iphone|cell/i;

/** Dialable numbers, mobile ones first, each number once. iOS never sets isPrimary. */
function usableNumbers(contact: Contact): PhoneNumber[] {
  const numbers = (contact.phoneNumbers ?? []).filter((p) => sanitizePhone(p.number ?? ''));
  const mobile = numbers.filter((p) => MOBILE_LABEL.test(phoneLabel(p)));
  const seen = new Set<string>();
  return [...mobile, ...numbers.filter((p) => !mobile.includes(p))].filter((p) => {
    const key = sanitizePhone(p.number ?? '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Resolves the chosen number, or null if the user cancels. An alert, not ActionSheetIOS:
 * RN shows alerts in their own window, so it appears even while the contact picker is
 * still animating away. An action sheet is presented on the app's top screen, which
 * UIKit can refuse mid-dismissal, and then its callback never runs.
 */
function chooseNumber(name: string, numbers: PhoneNumber[]): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(name ? `Which number for ${name}?` : 'Which number?', undefined, [
      ...numbers.map((p) => {
        const number = (p.number ?? '').trim();
        const label = phoneLabel(p);
        return { text: label ? `${label}: ${number}` : number, onPress: () => resolve(number) };
      }),
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

async function pickOnIos(): Promise<PickPartnerResult> {
  const contact = await presentContactPickerAsync();
  if (!contact) return CANCELLED;
  const name = displayName(contact);
  const numbers = usableNumbers(contact);
  // A contact without a number is still returned (phone '') so the UI can ask for it.
  let phone = numbers[0]?.number?.trim() ?? '';
  if (numbers.length > 1) {
    const chosen = await chooseNumber(name, numbers);
    if (chosen === null) return CANCELLED;
    phone = chosen;
  }
  return { status: 'picked', partner: { name, phone } };
}

async function pickOnAndroid(): Promise<PickPartnerResult> {
  if (!ContactPicker) return UNAVAILABLE;
  const picked = await ContactPicker.pickPhone();
  if (!picked) return CANCELLED;
  return {
    status: 'picked',
    partner: { name: (picked.name ?? '').trim(), phone: (picked.phone ?? '').trim() },
  };
}

/**
 * Opens the system contact picker. 'unavailable' means the picker cannot be shown
 * (e.g. Expo Go on Android, web, no contacts app); the UI should offer typing instead.
 * A second call while a picker is open resolves 'cancelled'.
 */
export async function pickPartnerContact(): Promise<PickPartnerResult> {
  if (picking) return CANCELLED;
  picking = true;
  try {
    if (Platform.OS === 'ios') return await pickOnIos();
    if (Platform.OS === 'android') return await pickOnAndroid();
    return UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  } finally {
    picking = false;
  }
}
