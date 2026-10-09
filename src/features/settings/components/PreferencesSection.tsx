import { useState } from 'react';
import { Platform } from 'react-native';

import { ListGroup, ListRow, SectionHeader, SegmentedControl } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { useSettings } from '@/store/selectors';
import { colors } from '@/theme';
import { currencyInfo, currencyLabel } from '../logic/currency';
import { CurrencySheet } from './CurrencySheet';
import { SettingSwitch } from './SettingSwitch';

type WeekStart = 'mon' | 'sun';

export function PreferencesSection() {
  const settings = useSettings();
  const updateSettings = useStore((s) => s.updateSettings);
  const haptic = useHaptics();
  const [pickingCurrency, setPickingCurrency] = useState(false);
  const currency = currencyInfo(settings.defaultCurrency);

  const setWeekStart = (v: WeekStart) => {
    const next = v === 'mon' ? 1 : 0;
    if (next === settings.weekStartsOn) return;
    haptic('selection');
    updateSettings({ weekStartsOn: next });
  };

  return (
    <>
      <SectionHeader title="Preferences" icon="tune-variant" />
      <ListGroup>
        <ListRow
          title="Default currency"
          subtitle="For new habits"
          icon="cash-multiple"
          iconColor={colors.success}
          value={currencyLabel(currency)}
          onPress={() => setPickingCurrency(true)}
          testID="settings-currency"
        />
        <ListRow
          title="Week starts on"
          icon="calendar-week"
          iconColor={colors.info}
          right={
            <SegmentedControl<WeekStart>
              segments={[
                { value: 'mon', label: 'Mon' },
                { value: 'sun', label: 'Sun' },
              ]}
              value={settings.weekStartsOn === 1 ? 'mon' : 'sun'}
              onChange={setWeekStart}
            />
          }
          testID="settings-week-start"
        />
        {Platform.OS !== 'web' ? (
          <ListRow
            title="Haptic feedback"
            icon="vibrate"
            iconColor={colors.purple}
            right={
              <SettingSwitch
                value={settings.hapticsEnabled}
                onChange={(v) => {
                  updateSettings({ hapticsEnabled: v });
                }}
                accessibilityLabel="Haptic feedback"
                testID="settings-haptics"
              />
            }
          />
        ) : null}
      </ListGroup>
      {pickingCurrency ? (
        <CurrencySheet
          value={settings.defaultCurrency}
          onClose={() => setPickingCurrency(false)}
          onSelect={(code) => {
            setPickingCurrency(false);
            if (code !== settings.defaultCurrency) updateSettings({ defaultCurrency: code });
          }}
        />
      ) : null}
    </>
  );
}
