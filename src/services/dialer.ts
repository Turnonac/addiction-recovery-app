import { Linking } from 'react-native';

function normalizeWidth(text: string): string {
  try {
    return text.normalize('NFKC');
  } catch {
    return text;
  }
}

/** Arabic-Indic (U+0660-0669) and Persian (U+06F0-06F9) digits, which NFKC leaves as they are. */
function toAsciiDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

/** The number starts at its first digit, with any '*' or '#' right before it (a code like *67). */
const NUMBER_START = /[*#]*\d/;

/**
 * After the number starts, a letter (an extension such as "ext", "x" or "p", or a second
 * label such as "Fax"), a pause (',') or a wait (';') ends it.
 */
const NUMBER_END = /[\p{L},;]/u;

/**
 * Returns the dialable main number: digits, '*' and '#', with a '+' in front when one comes
 * before the first digit ("+44", "(+44)", "Tel: +44"). Labels before the number are ignored,
 * and an extension or anything after the number is dropped, so its digits never join the main
 * number. A trunk "(0)" in an international number ("+44 (0)20") is dropped too. Full-width
 * and Arabic-Indic digits are normalized first. Returns '' when nothing dialable remains.
 */
export function sanitizePhone(phone: string): string {
  const text = toAsciiDigits(normalizeWidth(phone));
  const start = text.search(NUMBER_START);
  if (start === -1) return '';
  const international = text.slice(0, start).includes('+');
  let main = text.slice(start);
  const end = main.search(NUMBER_END);
  if (end !== -1) main = main.slice(0, end);
  if (international) main = main.replace(/\(\s*0\s*\)/g, '');
  const digits = main.replace(/[^0-9*#]/g, '');
  return international ? `+${digits}` : digits;
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
