import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

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
    await render(<Button title="Check in" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
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
      <ToggleRow label="Remind me to check in" value={false} onValueChange={onValueChange} />,
    );
    const toggle = screen.getByRole('switch', { name: 'Remind me to check in' });
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
