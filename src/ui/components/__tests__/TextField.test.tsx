/**
 * TextField errors: announced to VoiceOver on iOS when they appear or change
 * (accessibilityLiveRegion only reaches TalkBack on Android).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { TextField } from '@/ui/components';

const NO_NUMBER = 'Enter a number you can call.';

let announce: jest.SpiedFunction<typeof AccessibilityInfo.announceForAccessibility>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

describe('TextField errors on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('announces an error when it appears, and again when it changes', async () => {
    const view = await render(<TextField label="Phone" hint="Their mobile number" />);
    expect(announce).not.toHaveBeenCalled();

    await view.rerender(<TextField label="Phone" hint="Their mobile number" error={NO_NUMBER} />);
    expect(screen.getByText(NO_NUMBER)).toBeTruthy();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith(NO_NUMBER);

    // A re-render with the same error says nothing new.
    await view.rerender(<TextField label="Phone" hint="Their mobile number" error={NO_NUMBER} />);
    expect(announce).toHaveBeenCalledTimes(1);

    await view.rerender(<TextField label="Phone" error="Too long." />);
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith('Too long.');
  });

  it('stays quiet when the error goes away, and on mount', async () => {
    const view = await render(<TextField label="Phone" error={NO_NUMBER} />);
    await view.rerender(<TextField label="Phone" hint="Their mobile number" />);
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('TextField errors on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('leaves the error to the live region (no double reading in TalkBack)', async () => {
    const view = await render(<TextField label="Phone" />);
    await view.rerender(<TextField label="Phone" error={NO_NUMBER} />);
    expect(screen.getByText(NO_NUMBER)).toBeTruthy();
    expect(announce).not.toHaveBeenCalled();
  });
});
