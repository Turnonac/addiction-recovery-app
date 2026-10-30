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
    expect(sanitizePhone('tel: 555-CALL ext. 12')).toBe('555');
    expect(sanitizePhone('555\u00A0123\u2011456')).toBe('555123456');
  });

  it('drops an extension so its digits do not join the main number', () => {
    expect(sanitizePhone('555-1234 ext. 12')).toBe('5551234');
    expect(sanitizePhone('555-1234 Ext 12')).toBe('5551234');
    expect(sanitizePhone('555-1234 extension: 12')).toBe('5551234');
    expect(sanitizePhone('555-1234 x12')).toBe('5551234');
    expect(sanitizePhone('555-1234X 12')).toBe('5551234');
    expect(sanitizePhone('+1 555 123 4567 x 12')).toBe('+15551234567');
  });

  it('does not read an x or ext at the end of a word as an extension', () => {
    expect(sanitizePhone('Fax 555-1234')).toBe('5551234');
    expect(sanitizePhone('Text 555-1234')).toBe('5551234');
    expect(sanitizePhone('Fax 555-1234 x12')).toBe('5551234');
  });

  it('ignores a label before the number, even one ending in a comma or #', () => {
    expect(sanitizePhone('Cell, 555-123-4567')).toBe('5551234567');
    expect(sanitizePhone('Jane Doe, (555) 123-4567')).toBe('5551234567');
    expect(sanitizePhone('Mobile; 555-123-4567')).toBe('5551234567');
    expect(sanitizePhone('Cell #: 555-123-4567')).toBe('5551234567');
  });

  it('keeps a + that comes before the first digit', () => {
    expect(sanitizePhone('(+44) 7700 900123')).toBe('+447700900123');
    expect(sanitizePhone('Tel: +44 20 7946 0958')).toBe('+442079460958');
    expect(sanitizePhone('tel:+44-7700-900123')).toBe('+447700900123');
    // Mac Contacts wraps copied numbers in invisible direction marks.
    expect(sanitizePhone('\u202D+44 7700 900123\u202C')).toBe('+447700900123');
    expect(sanitizePhone('\u202A+972 50-123-4567\u202C')).toBe('+972501234567');
  });

  it('drops the trunk (0) in an international number', () => {
    expect(sanitizePhone('+44 (0)7700 900123')).toBe('+447700900123');
    expect(sanitizePhone('+49 ( 0 )30 1234567')).toBe('+49301234567');
  });

  it('ends the number at the first letter after it', () => {
    expect(sanitizePhone('022-2345 6789 Extn. 123')).toBe('02223456789');
    expect(sanitizePhone('555-123-4567p12')).toBe('5551234567');
    expect(sanitizePhone('555-123-4567 w12')).toBe('5551234567');
    expect(sanitizePhone('555-123-4567 poste 12')).toBe('5551234567');
    expect(sanitizePhone('Phone 555-123-4567 Fax 555-123-4568')).toBe('5551234567');
    expect(sanitizePhone('+1 555 123 4567 (mobile)')).toBe('+15551234567');
  });

  it('keeps a slash inside the number', () => {
    expect(sanitizePhone('030/1234567')).toBe('0301234567');
  });

  it('does not end the number at a letter typed as a dash', () => {
    expect(sanitizePhone('090\u30FC1234\u30FC5678')).toBe('09012345678');
    expect(sanitizePhone('\uFF10\uFF19\uFF10\uFF70\uFF11\uFF12\uFF13\uFF14\uFF70\uFF15\uFF16\uFF17\uFF18')).toBe(
      '09012345678',
    );
    expect(sanitizePhone('010\u31611234\u31615678')).toBe('01012345678');
    expect(sanitizePhone('010\u318D1234\u318D5678')).toBe('01012345678');
    expect(sanitizePhone('138\u4E000013\u4E008000')).toBe('13800138000');
    expect(sanitizePhone('\u0660\u0665\u0660\u0640\u0661\u0662\u0663\u0640\u0664\u0665\u0666\u0667')).toBe(
      '0501234567',
    );
  });

  it('does not treat a + inside a label as international', () => {
    expect(sanitizePhone('Tel+Fax: 089 1234567')).toBe('0891234567');
    expect(sanitizePhone('Mom+Dad: 555-123-4567')).toBe('5551234567');
  });

  it('keeps the 0 after +39 (Italy), even written as (0)', () => {
    expect(sanitizePhone('+39 (0)2 1234 5678')).toBe('+390212345678');
    expect(sanitizePhone('+39 06 1234 5678')).toBe('+390612345678');
  });

  it('keeps a service code only at the start, not a # from a label', () => {
    expect(sanitizePhone('#31#555-1234')).toBe('#31#5551234');
    expect(sanitizePhone('Phone #555-123-4567')).toBe('5551234567');
    expect(sanitizePhone('Ph#555-123-4567')).toBe('5551234567');
  });

  it('converts Arabic-Indic and Persian digits', () => {
    expect(sanitizePhone('\u0660\u0665\u0660 \u0661\u0662\u0663 \u0664\u0665\u0666\u0667')).toBe('0501234567');
    expect(sanitizePhone('\u06F0\u06F9\u06F1\u06F2 \u06F3\u06F4\u06F5 \u06F6\u06F7\u06F8\u06F9')).toBe('09123456789');
  });

  it('drops a pause or wait and what follows (how contacts store an extension)', () => {
    expect(sanitizePhone('555-1234,12')).toBe('5551234');
    expect(sanitizePhone('555-1234;12')).toBe('5551234');
    expect(sanitizePhone('555-1234,,12#')).toBe('5551234');
    expect(sanitizePhone('\uFF15\uFF15\uFF15-\uFF11\uFF12\uFF13\uFF14\uFF0C\uFF11\uFF12')).toBe('5551234');
  });

  it('normalizes full-width characters', () => {
    expect(sanitizePhone('\uFF0B\uFF11 \uFF15\uFF15\uFF15 \uFF11\uFF12\uFF13')).toBe('+1555123');
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

  it('dials only the main number when there is an extension', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await callPhone('555-123-4567,12');
    expect(openURL).toHaveBeenCalledWith('tel:5551234567');
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
