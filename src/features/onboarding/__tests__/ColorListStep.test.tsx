/** ColorListStep: one subtitle shape on every color page, and the skip link. */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { createMemoryRepository } from '@/data/memoryRepository';
import {
  COLOR_LEVELS,
  COLOR_MEANINGS,
  DEFAULT_SETTINGS,
  GREEN,
  LOCKED_RED_LINE,
  RED,
  type ColorLevel,
} from '@/domain/types';
import { ColorListStep } from '@/features/onboarding/ColorListStep';
import { useAppStore } from '@/state/store';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

const pristine = useAppStore.getState();
const noop = () => undefined;

beforeEach(async () => {
  useAppStore.setState(pristine, true);
  await useAppStore.getState().init(
    createMemoryRepository({
      days: [],
      behaviors: [],
      settings: {
        ...DEFAULT_SETTINGS,
        onboardingDone: false,
        installDate: null,
        partner: { name: 'Sam', phone: '555 0100' },
      },
    }),
  );
});

afterEach(() => {
  useAppStore.setState(pristine, true);
});

describe('ColorListStep', () => {
  it.each(COLOR_LEVELS)('shows the same subtitle on every color page (level %i)', async (level: ColorLevel) => {
    await render(<ColorListStep level={level} onNext={noop} onBack={noop} onSkip={noop} />);
    expect(
      screen.getByText(
        `${COLOR_MEANINGS[level]}. Write a few short examples. You can change them any time in the settings.`,
      ),
    ).toBeTruthy();
    // No longer names the partner on the first page.
    expect(screen.queryByText(/Sam/)).toBeNull();
  });

  it('keeps the locked Red line on the Red page', async () => {
    await render(<ColorListStep level={RED} onNext={noop} onBack={noop} onSkip={noop} />);
    expect(screen.getByText('Step 5 of 6 · Red (4 of 4)')).toBeTruthy();
    expect(screen.getByText(LOCKED_RED_LINE)).toBeTruthy();
  });

  it('"Write examples later" skips the remaining pages', async () => {
    const onSkip = jest.fn();
    const onNext = jest.fn();
    await render(<ColorListStep level={GREEN} onNext={onNext} onBack={noop} onSkip={onSkip} />);
    const skip = screen.getByRole('button', { name: 'Write examples later' });
    // Says where it goes, rather than repeating the label to screen readers.
    expect(skip.props.accessibilityHint).toBe('Skips to the reminder step');
    await fireEvent.press(skip);
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });
});
