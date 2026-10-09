import { Platform, Switch } from 'react-native';

import { colors } from '@/theme';

export interface SettingSwitchProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

/** Switch styled like ListRow's built-in toggle, with a disabled state. */
export function SettingSwitch({ value, onChange, disabled, accessibilityLabel, testID }: SettingSwitchProps) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: colors.cardStrong, true: colors.accent }}
      thumbColor={colors.text}
      {...(Platform.OS === 'web' ? { activeThumbColor: colors.text } : null)}
      ios_backgroundColor={colors.cardStrong}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      testID={testID}
      style={disabled ? { opacity: 0.45 } : undefined}
    />
  );
}
