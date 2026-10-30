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
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

/**
 * After the number starts, a letter (an extension such as "ext", "x" or "p", or a second
 * label such as "Fax"), a pause (',') or a wait (';') ends it. Letters that keyboards type as
 * a dash are not an end: Japanese 'ー', Korean 'ㅡ' and 'ㆍ' (and their NFKC forms), Chinese
 * '一' and the Arabic tatweel 'ـ'.
 */
const NUMBER_END = /(?![\u30FC\u3161\u1173\u318D\u119E\u4E00\u0640])[\p{L},;]/u;

/** A service code such as *67 or #31#, typed at the very start. */
const SERVICE_CODE = /^\s*[*#]+\d/;

/** A '+' with no letter after it: "+44", "(+44)", "Tel: +44", but not "Tel+Fax: 089". */
const PLUS_PREFIX = /\+\P{L}*$/u;

/**
 * Countries whose numbers keep the 0 after the country code (Italy, San Marino, Vatican),
 * so "+39 (0)2" is not a trunk prefix to drop.
 */
const KEEPS_ZERO = /^3(?:9|78|79)\D/;

/**
 * Returns the dialable main number: digits, '*' and '#', with a '+' in front when the text
 * before the first digit ends in one (see PLUS_PREFIX). Other text before the number is
 * ignored, except a leading service code. An extension or anything after the number is
 * dropped, so its digits never join the main number. A trunk "(0)" in an international number
 * ("+44 (0)20") is dropped too. Full-width and Arabic-Indic digits are normalized first.
 * Returns '' when there is no digit.
 */
export function sanitizePhone(phone: string): string {
  const text = toAsciiDigits(normalizeWidth(phone));
  const firstDigit = text.search(/\d/);
  if (firstDigit === -1) return '';
  const start = SERVICE_CODE.test(text) ? text.search(/[*#]/) : firstDigit;
  const international = PLUS_PREFIX.test(text.slice(0, start));
  let main = text.slice(start);
  const end = main.search(NUMBER_END);
  if (end !== -1) main = main.slice(0, end);
  if (international && !KEEPS_ZERO.test(main)) main = main.replace(/\(\s*0\s*\)/g, '');
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
