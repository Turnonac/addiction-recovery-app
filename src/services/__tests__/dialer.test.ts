import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';

import { callPhone, sanitizePhone } from '@/services/dialer';

describe('sanitizePhone', () => {
  it('strips spaces, dashes, brackets and dots', () => {
    expect(sanitizePhone('(555) 123-4567')).toBe('5551234567');
    expect(sanitizePhone('555.123.4567')).toBe('5551234567');
  });

  it('keeps a leading plus', () => {
    expect(sanitizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    expect(sanitizePhone('  +44 20 7946 0958 ')).toBe('+442079460958');
  });

  it('drops a plus that is not leading', () => {
    expect(sanitizePhone('1+555+123')).toBe('1555123');
    expect(sanitizePhone('++1 555')).toBe('+1555');
  });

  it('keeps * and #', () => {
    expect(sanitizePhone('*67 555-1234#')).toBe('*675551234#');
    expect(sanitizePhone('555 1234 # 2')).toBe('5551234#2');
  });

  it('drops letters and other symbols', () => {
    expect(sanitizePhone('tel: 555-CALL ext. 12')).toBe('55512');
    expect(sanitizePhone('555 123‑456')).toBe('555123456');
  });

  it('normalizes full-width characters', () => {
    expect(sanitizePhone('＋１ ５５５ １２３')).toBe('+1555123');
  });

  it('returns an empty string when nothing dialable remains', () => {
    expect(sanitizePhone('')).toBe('');
    expect(sanitizePhone('   ')).toBe('');
    expect(sanitizePhone('+')).toBe('');
    expect(sanitizePhone('James')).toBe('');
  });
});

describe('callPhone', () => {
  // jest-expo already mocks Linking.openURL, so clear recorded calls between tests.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens a tel: URL with the sanitized number', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(callPhone('+1 (555) 123-4567')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('tel:+15551234567');
  });

  it('percent-encodes # so it is not read as a URL fragment', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await callPhone('555 1234#');
    expect(openURL).toHaveBeenCalledWith('tel:5551234%23');
  });

  it('returns false without opening anything for an empty number', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(callPhone(' - ')).resolves.toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('returns false when the dialer cannot be opened', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no dialer'));
    await expect(callPhone('5551234')).resolves.toBe(false);
  });

  it('returns false when iOS resolves false (the Simulator has no Phone app)', async () => {
    // Typed as Promise<void>, but RCTLinkingManager resolves @NO for a failed tel: on the Simulator.
    jest.spyOn(Linking, 'openURL').mockResolvedValue(false as unknown as void);
    await expect(callPhone('5551234')).resolves.toBe(false);
  });

  it('returns true when Android resolves true', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as unknown as void);
    await expect(callPhone('5551234')).resolves.toBe(true);
  });
});
