/**
 * BehaviorEditor's save failure: shown in the sheet, and announced to VoiceOver
 * on iOS (accessibilityLiveRegion only reaches TalkBack on Android).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { GREEN, type ColorLevel } from '@/domain/types';
import { BehaviorEditor } from '@/features/onboarding/BehaviorEditor';
import { useAppStore } from '@/state/store';

const SAVE_FAILED = "That didn't save. Please try again.";

const pristine = useAppStore.getState();
const addBehavior = jest.fn<(color: ColorLevel, text: string) => Promise<void>>(async () => {
  throw new Error('disk I/O error');
});

let announce: jest.SpiedFunction<typeof AccessibilityInfo.announceForAccessibility>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  useAppStore.setState({ addBehavior });
});

afterEach(() => {
  useAppStore.setState(pristine, true);
});

async function failToSave() {
  await render(<BehaviorEditor levels={[GREEN]} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add a Green behavior' }));
  await fireEvent.changeText(screen.getByLabelText('Green behavior'), 'Calling a friend');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
  expect(addBehavior).toHaveBeenCalledWith(GREEN, 'Calling a friend');
}

describe('BehaviorEditor save failure on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('announces the failure, and again when a retry fails', async () => {
    await failToSave();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(SAVE_FAILED);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(announce).toHaveBeenCalledTimes(2);
  });
});

describe('BehaviorEditor save failure on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('leaves the failure to the live region (no double reading in TalkBack)', async () => {
    await failToSave();
    expect(announce).not.toHaveBeenCalled();
  });
});
