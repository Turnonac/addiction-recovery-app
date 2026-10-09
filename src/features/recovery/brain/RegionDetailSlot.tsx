import { StyleSheet, View } from 'react-native';

import type { RegionView } from '../logic';
import { RegionLegend } from './RegionLegend';
import { RegionPanel } from './RegionPanel';

export interface RegionDetailSlotProps {
  regions: RegionView[];
  /** Region whose details are shown; null shows the hint and legend. */
  panelId: string | null;
  /** Region highlighted on the brain (tints its legend chip). */
  selectedId: string | null;
  /** Legend chip tap (same as tapping the region's marker). */
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * Fixed-height area under the brain: the hint and legend while nothing is
 * selected, a region's details after a marker tap.
 *
 * Every possible content (legend + one panel per region) is laid out invisibly
 * in the same cell, so the slot is always as tall as the tallest of them at the
 * current width. Opening, switching or closing the details never changes the
 * height of anything above the region list, so rows never move under the finger.
 */
export function RegionDetailSlot({ regions, panelId, selectedId, onSelect, onClose }: RegionDetailSlotProps) {
  const selected = regions.find((r) => r.id === panelId) ?? null;

  return (
    <View style={styles.slot} testID="brain-detail-slot">
      <View style={styles.sizer} aria-hidden>
        <View style={styles.layer}>
          <RegionLegend regions={regions} />
        </View>
        {regions.map((r) => (
          <View key={r.id} style={styles.layer}>
            <RegionPanel region={r} />
          </View>
        ))}
      </View>

      <View style={styles.visible}>
        {selected ? (
          <RegionPanel region={selected} onClose={onClose} style={styles.fill} testID="brain-region-panel" />
        ) : (
          <RegionLegend regions={regions} highlightedId={selectedId} onSelect={onSelect} style={styles.fill} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'relative' },
  // Layers sit on top of each other in one row (each is full width and pulls the
  // next one back with a -100% margin), so the row is as tall as the tallest layer.
  sizer: { flexDirection: 'row', opacity: 0, pointerEvents: 'none' },
  layer: { width: '100%', marginRight: '-100%' },
  visible: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  fill: { flex: 1 },
});
