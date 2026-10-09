import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components';
import { TRIGGERS } from '@/domain/catalog/triggers';
import { useHaptics } from '@/hooks/useHaptics';
import type { TriggerId } from '@/types';
import { toggleInOrder } from '../relapseLogic';

const ALL_IDS = TRIGGERS.map((t) => t.id);

export interface TriggerPickerProps {
  value: TriggerId[];
  onChange: (value: TriggerId[]) => void;
}

/** Multi-select trigger chips; a selected chip takes the trigger's own color. */
export function TriggerPicker({ value, onChange }: TriggerPickerProps) {
  const haptic = useHaptics();
  return (
    <View style={styles.wrap} accessibilityRole="list">
      {TRIGGERS.map((t) => {
        const selected = value.includes(t.id);
        return (
          <Chip
            key={t.id}
            size="md"
            label={t.label}
            icon={t.icon}
            color={selected ? t.color : undefined}
            selected={selected}
            accessibilityLabel={`${t.label}: ${t.description}`}
            testID={`trigger-${t.id}`}
            onPress={() => {
              haptic('selection');
              onChange(toggleInOrder(value, t.id, ALL_IDS));
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
