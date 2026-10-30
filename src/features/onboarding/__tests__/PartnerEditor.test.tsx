/**
 * PartnerEditor's pick-result notices: shown on screen, and announced to VoiceOver
 * on iOS (accessibilityLiveRegion only reaches TalkBack on Android) at high priority,
 * so the closing picker can't cut the announcement off.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import type { Partner } from '@/domain/types';
import { EMPTY_PARTNER, PartnerEditor } from '@/features/onboarding/PartnerEditor';
import { pickPartnerContact, type PickPartnerResult } from '@/services/contacts';

jest.mock('@/services/contacts', () => ({ pickPartnerContact: jest.fn() }));

const pick = jest.mocked(pickPartnerContact);

function Harness() {
  const [value, setValue] = useState<Partner>(EMPTY_PARTNER);
  const [showCard, setShowCard] = useState(false);
  return (
    <PartnerEditor
      value={value}
      onChange={setValue}
      showCard={showCard}
      onShowCardChange={setShowCard}
    />
  );
}

async function chooseWith(result: PickPartnerResult) {
  pick.mockResolvedValueOnce(result);
  await render(<Harness />);
  await fireEvent.press(screen.getByRole('button', { name: 'Choose from contacts' }));
}

let announce: jest.SpiedFunction<typeof AccessibilityInfo.announceForAccessibilityWithOptions>;
let plainAnnounce: jest.SpiedFunction<typeof AccessibilityInfo.announceForAccessibility>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
    .mockImplementation(() => {});
  plainAnnounce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
});

describe('PartnerEditor notices on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it.each<[string, PickPartnerResult, string]>([
    [
      'no number',
      { status: 'picked', partner: { name: 'Sam', phone: '' } },
      'That contact has no phone number. Type it below.',
    ],
    [
      'no name',
      { status: 'picked', partner: { name: '', phone: '555 0100' } },
      'That contact has no name. Type one below.',
    ],
    [
      'unavailable',
      { status: 'unavailable' },
      "Contacts can't be opened here. Type the name and number instead.",
    ],
  ])('announces the %s notice', async (_case, result, notice) => {
    await chooseWith(result);
    expect(await screen.findByText(notice)).toBeTruthy();
    expect(announce).toHaveBeenCalledWith(notice, { priority: 'high' });
    expect(plainAnnounce).not.toHaveBeenCalled();
  });

  it('announces nothing for a complete pick or a cancel', async () => {
    await chooseWith({ status: 'picked', partner: { name: 'Sam', phone: '555 0100' } });
    expect(await screen.findByRole('button', { name: 'Change partner, currently Sam' })).toBeTruthy();
    pick.mockResolvedValueOnce({ status: 'cancelled' });
    await fireEvent.press(screen.getByRole('button', { name: 'Change partner, currently Sam' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Choose from contacts' }));
    expect(announce).not.toHaveBeenCalled();
    expect(plainAnnounce).not.toHaveBeenCalled();
  });

  it('announces the phone error when it appears', async () => {
    await render(<Harness />);
    const phone = screen.getByLabelText('Phone');
    await fireEvent.changeText(phone, 'abc');
    await fireEvent(phone, 'blur');
    expect(await screen.findByText('Enter a number you can call.')).toBeTruthy();
    expect(plainAnnounce).toHaveBeenCalledTimes(1);
    expect(plainAnnounce).toHaveBeenCalledWith('Enter a number you can call.');
  });
});

describe('PartnerEditor notices on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('leaves the notice to the live region (no double reading in TalkBack)', async () => {
    await chooseWith({ status: 'picked', partner: { name: 'Sam', phone: '' } });
    expect(await screen.findByText('That contact has no phone number. Type it below.')).toBeTruthy();
    expect(announce).not.toHaveBeenCalled();
    expect(plainAnnounce).not.toHaveBeenCalled();
  });

  it('leaves the phone error to the live region', async () => {
    await render(<Harness />);
    const phone = screen.getByLabelText('Phone');
    await fireEvent.changeText(phone, 'abc');
    await fireEvent(phone, 'blur');
    expect(await screen.findByText('Enter a number you can call.')).toBeTruthy();
    expect(plainAnnounce).not.toHaveBeenCalled();
  });
});
