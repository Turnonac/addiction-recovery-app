import { Linking } from 'react-native';

/**
 * Opens the phone dialer with `phone` exactly as the user typed or picked it: nothing is
 * removed or reformatted. Only characters a URL cannot carry (spaces, '#', non-ASCII) are
 * percent-encoded. Resolves false for an empty number or when the OS cannot open the dialer
 * (for example a tablet without telephony, or the iOS Simulator).
 */
export async function callPhone(phone: string): Promise<boolean> {
  const number = phone.trim();
  if (number.length === 0) return false;
  try {
    // encodeURI leaves '#' as is, but in a URL it would start a fragment.
    const opened: unknown = await Linking.openURL(`tel:${encodeURI(number).replace(/#/g, '%23')}`);
    // Typed as void, but iOS resolves false (instead of rejecting) when the Simulator
    // can't open a tel: URL. Android resolves true.
    return opened !== false;
  } catch {
    return false;
  }
}
