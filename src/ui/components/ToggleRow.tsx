import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/ui/theme';

export interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Muted line under the label; also read as the accessibility hint. */
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Label + switch. The whole row (min 52pt tall) is the touch target and is
 * announced as a switch with its on/off state. Knob position is the non-color cue.
 */
export function ToggleRow({
  label,
  value,
  onValueChange,
  description,
  disabled = false,
  style,
  testID,
}: ToggleRowProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 52,
          paddingVertical: 10,
          paddingHorizontal: 16,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 16 }}>{label}</Text>
        {description ? (
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>{description}</Text>
        ) : null}
      </View>
      <SwitchTrack value={value} />
    </Pressable>
  );
}

/** Visual-only switch (52x32 track, 26pt knob) in a 56x44 box, per the mockup. */
function SwitchTrack({ value }: { value: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={{ width: 56, height: 44, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          width: 52,
          height: 32,
          padding: 3,
          borderRadius: 16,
          flexDirection: 'row',
          justifyContent: value ? 'flex-end' : 'flex-start',
          backgroundColor: value ? theme.accent : theme.trackOff,
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: theme.knob,
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.25)',
          }}
        />
      </View>
    </View>
  );
}
