/**
 * Pick the partner from the phone's contacts without asking for contacts permission.
 *
 * iOS: CNContactPickerViewController via `expo-contacts/legacy` `presentContactPickerAsync`
 *      (runs out of process, no permission prompt).
 * Android: local module `modules/contact-picker` (Intent.ACTION_PICK on phone numbers,
 *      temporary read grant). READ_CONTACTS is blocked in app.json, so expo-contacts is
 *      never used on Android.
 */
import { presentContactPickerAsync, type Contact } from 'expo-contacts/legacy';
import { Platform } from 'react-native';

import type { Partner } from '@/domain/types';

import ContactPicker from '../../modules/contact-picker';

export type PickPartnerResult =
  | { status: 'picked'; partner: Partner }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

const CANCELLED: PickPartnerResult = { status: 'cancelled' };
const UNAVAILABLE: PickPartnerResult = { status: 'unavailable' };

let picking = false;

function displayName(contact: Contact): string {
  const full = contact.name?.trim();
  if (full) return full;
  const parts = [contact.firstName, contact.middleName, contact.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(' ');
  return contact.nickname?.trim() || contact.company?.trim() || '';
}

function firstPhone(contact: Contact): string {
  const numbers = (contact.phoneNumbers ?? []).filter((p) => p.number?.trim());
  const chosen = numbers.find((p) => p.isPrimary) ?? numbers[0];
  return chosen?.number?.trim() ?? '';
}

async function pickOnIos(): Promise<PickPartnerResult> {
  const contact = await presentContactPickerAsync();
  if (!contact) return CANCELLED;
  // A contact without a number is still returned (phone '') so the UI can ask for it.
  return { status: 'picked', partner: { name: displayName(contact), phone: firstPhone(contact) } };
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
