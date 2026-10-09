import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { formatDateTime } from '@/utils/format';
import { Chip } from './Chip';
import { Text } from './Text';

export interface DateTimeFieldProps {
  label?: string;
  /** Epoch ms */
  value: number;
  onChange: (value: number) => void;
  /** Earliest selectable time (epoch ms). */
  minimumDate?: number;
  /** Latest selectable time (epoch ms). Defaults to now for past-only pickers. */
  maximumDate?: number;
  /** 'datetime' (default) or 'date' (time fixed at current value's time). */
  mode?: 'datetime' | 'date';
  hint?: string;
  testID?: string;
}

// STUB — owned by the habit-form feature, which replaces this with a full
// cross-platform calendar + time picker. Keep the exported name and props.
export function DateTimeField({ label, value, onChange, minimumDate, maximumDate, hint, testID }: DateTimeFieldProps) {
  const clamp = (v: number) => Math.min(maximumDate ?? Number.POSITIVE_INFINITY, Math.max(minimumDate ?? Number.NEGATIVE_INFINITY, v));
  return (
    <View style={styles.wrap} testID={testID}>
      {label ? (
        <Text variant="captionStrong" tone="secondary">
          {label}
        </Text>
      ) : null}
      <View style={styles.field}>
        <Text variant="bodyStrong">{formatDateTime(value)}</Text>
      </View>
      <View style={styles.row}>
        <Chip label="Now" onPress={() => onChange(clamp(Date.now()))} size="md" />
      </View>
      {hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
