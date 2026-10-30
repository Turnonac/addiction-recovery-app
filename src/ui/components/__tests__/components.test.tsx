import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform, ScrollView, Text, TextInput } from 'react-native';

import { LOCKED_RED_LINE } from '@/domain/types';
import {
  AddChip,
  Button,
  Chip,
  ColorOptionCard,
  ColorTotals,
  MonthCalendar,
  Screen,
  SettingsGroup,
  SettingsRow,
  ToggleRow,
  WeekStrip,
  type MonthCalendarCell,
} from '@/ui/components';
import { TabIcon } from '@/ui/icons';

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

describe('Button', () => {
  it('calls onPress and exposes a button role', async () => {
    const onPress = jest.fn();
    await render(<Button title="Log today’s color" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log today’s color' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Pick a color to save" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Pick a color to save' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ColorOptionCard', () => {
  it('is a radio with checked state and shows behaviors', async () => {
    const onPress = jest.fn();
    await render(
      <ColorOptionCard level={0} selected behaviors={['Prayed', 'Called James']} onPress={onPress} />,
    );
    const radio = screen.getByRole('radio');
    expect(radio).toBeChecked();
    expect(screen.getByText('Green')).toBeOnTheScreen();
    expect(screen.getByText('Prayed · Called James')).toBeOnTheScreen();
    await fireEvent.press(radio);
    expect(onPress).toHaveBeenCalled();
  });

  it('always shows the locked Red line first, without duplicating it', async () => {
    await render(
      <>
        <ColorOptionCard level={3} selected={false} behaviors={[]} onPress={() => {}} />
        <ColorOptionCard
          level={3}
          selected={false}
          behaviors={[LOCKED_RED_LINE, 'Other']}
          onPress={() => {}}
        />
      </>,
    );
    expect(screen.getByText(LOCKED_RED_LINE)).toBeOnTheScreen();
    expect(screen.getByText(`${LOCKED_RED_LINE} · Other`)).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')[0]).not.toBeChecked();
  });

  it('shows no behavior line for an empty non-Red list', async () => {
    await render(<ColorOptionCard level={1} selected={false} behaviors={[]} onPress={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Blue. Careless about avoiding Red' })).toBeOnTheScreen();
  });
});

describe('ToggleRow', () => {
  it('is a switch that reports the next value', async () => {
    const onValueChange = jest.fn();
    await render(
      <ToggleRow label="Remind me to log my color" value={false} onValueChange={onValueChange} />,
    );
    const toggle = screen.getByRole('switch', { name: 'Remind me to log my color' });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('MonthCalendar', () => {
  const cells: MonthCalendarCell[] = [
    { date: null, color: null, checkedIn: false, isToday: false, isFuture: false },
    { date: '2026-10-27', color: 0, checkedIn: true, isToday: false, isFuture: false },
    { date: '2026-10-28', color: null, checkedIn: false, isToday: false, isFuture: false },
    { date: '2026-10-29', color: null, checkedIn: false, isToday: true, isFuture: false },
    { date: '2026-10-30', color: null, checkedIn: false, isToday: false, isFuture: true },
    { date: '2026-10-31', color: null, checkedIn: false, isToday: false, isFuture: true },
    { date: null, color: null, checkedIn: false, isToday: false, isFuture: false },
  ];

  it('presses past and today days, labels them, and keeps future days inert', async () => {
    const onPressDay = jest.fn();
    const onNext = jest.fn();
    await render(
      <MonthCalendar
        cells={cells}
        onPressDay={onPressDay}
        partnerName="James"
        title="October 2026"
        onPrevMonth={() => {}}
        onNextMonth={onNext}
        canGoNext={false}
      />,
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Tuesday, October 27: Green, checked in with James' }),
    );
    expect(onPressDay).toHaveBeenCalledWith('2026-10-27');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Thursday, October 29, today: not logged yet' }),
    );
    expect(onPressDay).toHaveBeenCalledWith('2026-10-29');
    expect(screen.queryByRole('button', { name: /October 30/ })).toBeNull();
    // 3 day buttons + 2 month buttons
    expect(screen.getAllByRole('button')).toHaveLength(5);
    const next = screen.getByRole('button', { name: 'Next month' });
    expect(next).toBeDisabled();
  });
});

describe('WeekStrip', () => {
  it('labels each day with color and call status', async () => {
    await render(
      <WeekStrip
        partnerName="James"
        days={[
          { date: '2026-10-28', color: 1, checkedIn: false, isToday: false },
          { date: '2026-10-29', color: null, checkedIn: false, isToday: true },
        ]}
      />,
    );
    expect(screen.getByLabelText('Wednesday, October 28: Blue, no call')).toBeOnTheScreen();
    expect(screen.getByLabelText('Thursday, October 29, today: not logged yet')).toBeOnTheScreen();
  });

  it('does not count days before install as missed calls', async () => {
    await render(
      <WeekStrip
        partnerName="James"
        days={[
          { date: '2026-10-26', color: null, checkedIn: false, isToday: false, beforeInstall: true },
          { date: '2026-10-27', color: 0, checkedIn: true, isToday: false, beforeInstall: true },
          { date: '2026-10-28', color: null, checkedIn: false, isToday: false, beforeInstall: false },
        ]}
      />,
    );
    expect(screen.getByLabelText('Monday, October 26: not logged yet')).toBeOnTheScreen();
    expect(screen.getByLabelText('Tuesday, October 27: Green, checked in with James')).toBeOnTheScreen();
    expect(screen.getByLabelText('Wednesday, October 28: not logged yet, no call')).toBeOnTheScreen();
  });
});

describe('Chips', () => {
  it('renders locked, editable and add chips', async () => {
    const onEdit = jest.fn();
    const onAdd = jest.fn();
    await render(
      <>
        <Chip label={LOCKED_RED_LINE} level={3} locked />
        <Chip label="Opened a private tab" level={2} onPress={onEdit} accessibilityLabel="Edit: Opened a private tab" />
        <AddChip onPress={onAdd} accessibilityLabel="Add a Yellow behavior" />
      </>,
    );
    expect(screen.getByLabelText(`${LOCKED_RED_LINE}, locked`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: `${LOCKED_RED_LINE}, locked` })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit: Opened a private tab' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add a Yellow behavior' }));
    expect(onEdit).toHaveBeenCalled();
    expect(onAdd).toHaveBeenCalled();
  });
});

describe('Screen footer', () => {
  it('is capped and scrolls, so large text cannot push its last button off-screen', async () => {
    const onSave = jest.fn();
    await render(
      <Screen testID="page" footer={<Button title="Save color" onPress={onSave} />}>
        <Text>Body</Text>
      </Screen>,
    );
    const footer = screen.getByTestId('page-footer');
    expect(footer).toHaveStyle({ maxHeight: '55%' });
    // The footer's content sits in its own scroll view.
    expect(footer.children[0]).toHaveProp('keyboardShouldPersistTaps', 'handled');
    await fireEvent.press(screen.getByRole('button', { name: 'Save color' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('Screen keyboard (avoidKeyboard)', () => {
  // The jest ScrollView mock shares these instance methods on its prototype.
  const scrollViewMethods = ScrollView.prototype as {
    getInnerViewRef: jest.Mock<() => unknown>;
    scrollTo: jest.Mock<(options: { y: number; animated: boolean }) => void>;
  };
  const content = { name: 'body content' };
  type FocusedInput = ReturnType<typeof TextInput.State.currentlyFocusedInput>;
  /** Fake focused field whose measureLayout reports `top` and `height` in the body content. */
  function focusField(top: number, height = 48) {
    const input = {
      measureLayout: jest.fn((_relativeTo: unknown, onSuccess: (...rect: number[]) => void) =>
        onSuccess(20, top, 350, height),
      ),
    };
    jest
      .spyOn(TextInput.State, 'currentlyFocusedInput')
      .mockReturnValue(input as unknown as NonNullable<FocusedInput>);
    return input;
  }
  const keyboard = { endCoordinates: { screenX: 0, screenY: 500, width: 390, height: 344 } };
  const showKeyboard = () => act(() => void DeviceEventEmitter.emit('keyboardDidShow', keyboard));

  async function renderForm() {
    const page = await render(
      <Screen testID="page" avoidKeyboard footer={<Button title="Continue" onPress={() => {}} />}>
        <Text>Form</Text>
      </Screen>,
    );
    const body = screen.getByTestId('page').children[0];
    if (typeof body === 'string') throw new Error('expected the body scroll view');
    return { page, body };
  }
  const layoutBody = (body: Parameters<typeof fireEvent>[0], height: number) =>
    fireEvent(body, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } });

  beforeEach(() => {
    scrollViewMethods.getInnerViewRef.mockReturnValue(content);
    scrollViewMethods.scrollTo.mockClear();
  });

  afterEach(async () => {
    await act(() => void DeviceEventEmitter.emit('keyboardDidHide', null));
    scrollViewMethods.getInnerViewRef.mockReset();
    jest.restoreAllMocks();
  });

  it('on iOS scrolls the focused field to just above the footer once the keyboard is up', async () => {
    const { body } = await renderForm();
    await layoutBody(body, 300);
    await fireEvent.scroll(body, { nativeEvent: { contentOffset: { x: 0, y: 40 } } });
    const input = focusField(400);
    await showKeyboard();
    expect(input.measureLayout).toHaveBeenCalledWith(content, expect.any(Function));
    // 400 + 48 + 16 gap - 300 visible.
    expect(scrollViewMethods.scrollTo).toHaveBeenCalledWith({ y: 164, animated: true });
  });

  it('scrolls again when the body shrinks with the keyboard up (a footer appears)', async () => {
    const { body } = await renderForm();
    await layoutBody(body, 300);
    focusField(200);
    await showKeyboard();
    expect(scrollViewMethods.scrollTo).not.toHaveBeenCalled();
    await layoutBody(body, 200);
    expect(scrollViewMethods.scrollTo).toHaveBeenCalledWith({ y: 64, animated: true });
  });

  it('never scrolls past the top of a field taller than the visible body', async () => {
    const { body } = await renderForm();
    await layoutBody(body, 100);
    focusField(400, 160);
    await showKeyboard();
    expect(scrollViewMethods.scrollTo).toHaveBeenCalledWith({ y: 384, animated: true });
  });

  it('stops listening on unmount', async () => {
    const { page, body } = await renderForm();
    await layoutBody(body, 300);
    const input = focusField(400);
    await page.unmount();
    await showKeyboard();
    expect(input.measureLayout).not.toHaveBeenCalled();
    expect(scrollViewMethods.scrollTo).not.toHaveBeenCalled();
  });

  it('leaves Android unchanged', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const { body } = await renderForm();
    expect(body.props.onLayout).toBeUndefined();
    expect(body.props.onScroll).toBeUndefined();
    const input = focusField(400);
    await showKeyboard();
    expect(input.measureLayout).not.toHaveBeenCalled();
    expect(scrollViewMethods.scrollTo).not.toHaveBeenCalled();
  });
});

describe('Settings rows, totals, screen and tab icon', () => {
  it('renders without crashing', async () => {
    const onPress = jest.fn();
    await render(
      <Screen footer={<Text>Footer</Text>} edges={['top', 'bottom']}>
        <SettingsGroup title="Recovery" footnote="Note">
          <SettingsRow title="My colors" subtitle="10 behaviors" onPress={onPress} />
          <SettingsRow title="Time" value="9:00 PM" disabled onPress={onPress} />
        </SettingsGroup>
        <ColorTotals counts={{ 0: 12, 1: 1, 2: 0, 3: 0 }} />
        <TabIcon name="today" focused color="#000" />
      </Screen>,
    );
    expect(screen.getByLabelText('Green: 12 days')).toBeOnTheScreen();
    expect(screen.getByLabelText('Blue: 1 day')).toBeOnTheScreen();
    expect(screen.getByText('Footer')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /My colors/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Time/ })).toBeDisabled();
  });
});
