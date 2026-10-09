import { StyleSheet, View } from 'react-native';

import { Chip, Icon } from '@/components';
import { moodFor } from '@/domain/catalog/moods';
import { triggerFor } from '@/domain/catalog/triggers';
import { radius, withAlpha } from '@/theme';
import type { MoodId, TriggerId } from '@/types';

/** Trigger pills in their catalog colors ("⚡ Stress", "👥 Social situation"). */
export function TriggerChips({ triggers, max }: { triggers: TriggerId[]; max?: number }) {
  if (!triggers.length) return null;
  const shown = max != null ? triggers.slice(0, max) : triggers;
  const hidden = triggers.length - shown.length;
  return (
    <View style={styles.chips}>
      {shown.map((id) => {
        const t = triggerFor(id);
        return <Chip key={id} label={t.label} icon={t.icon} color={t.color} />;
      })}
      {hidden > 0 ? <Chip label={`+${hidden}`} /> : null}
    </View>
  );
}

/** Round mood icon in the mood's color. */
export function MoodBadge({ mood, size = 26 }: { mood: MoodId; size?: number }) {
  const m = moodFor(mood);
  return (
    <View
      style={[styles.mood, { width: size, height: size, borderRadius: size / 2, backgroundColor: withAlpha(m.color, 0.16), borderColor: withAlpha(m.color, 0.35) }]}
      accessible
      accessibilityLabel={`Mood: ${m.label}`}
    >
      <Icon name={m.icon} size={Math.round(size * 0.58)} color={m.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mood: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill },
});
