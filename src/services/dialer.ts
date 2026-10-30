import { Linking } from 'react-native';

/**
 * Keeps a leading '+', digits, '*' and '#'. Everything else (spaces, dashes,
 * brackets, dots, letters, extra '+') is dropped. Full-width characters are
 * normalized first. Returns '' when nothing dialable remains.
 */
function normalizeWidth(text: string): string {
  try {
    return text.normalize('NFKC');
  } catch {
    return text;
  }
}

export function sanitizePhone(phone: string): string {
  const normalized = normalizeWidth(phone).trim();
  const digits = normalized.replace(/[^0-9*#]/g, '');
  if (digits.length === 0) return '';
  return normalized.startsWith('+') ? `+${digits}` : digits;
}

/**
 * Opens the phone dialer for `phone`. Resolves false for an empty number or when
 * the OS cannot open the dialer (for example a tablet without telephony, or the
 * iOS Simulator).
 */
export async function callPhone(phone: string): Promise<boolean> {
  const number = sanitizePhone(phone);
  if (number.length === 0) return false;
  try {
    // '#' would start a URL fragment, so it is percent-encoded.
    const opened: unknown = await Linking.openURL(`tel:${number.replace(/#/g, '%23')}`);
    // Typed as void, but iOS resolves false (instead of rejecting) when the Simulator
    // can't open a tel: URL. Android resolves true.
    return opened !== false;
  } catch {
    return false;
  }
}
