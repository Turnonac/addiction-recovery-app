import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';

import { callPhone } from '@/services/dialer';

describe('callPhone', () => {
  // jest-expo already mocks Linking.openURL, so clear recorded calls between tests.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('dials the number exactly as entered', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(callPhone('+1-555-123-4567')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('tel:+1-555-123-4567');
  });

  it('keeps an extension pause for the phone to handle', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await callPhone('555-123-4567,12');
    expect(openURL).toHaveBeenCalledWith('tel:555-123-4567,12');
  });

  it('percent-encodes only what a URL cannot carry', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await callPhone(' (555) 123 4567 ');
    expect(openURL).toHaveBeenCalledWith('tel:(555)%20123%204567');
    await callPhone('555 1234#');
    expect(openURL).toHaveBeenLastCalledWith('tel:555%201234%23');
  });

  it('returns false without opening anything for an empty number', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(callPhone('   ')).resolves.toBe(false);
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
