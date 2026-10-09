import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';

import { Icon, Text } from '@/components';
import { triggerFor } from '@/domain/catalog/triggers';
import type { TriggerStat } from '@/domain/stats';
import { colors, withAlpha } from '@/theme';
import { useLayoutWidth } from '../components/useLayoutWidth';
import { roundPercent } from '../format';
import { polar, pointsAttr, wedgePath } from './geometry';

export interface RadarChartProps {
  /** One item per trigger, in radar axis order. */
  items: TriggerStat[];
  relapseCount: number;
}

const RINGS = 5;
const ICON = 30;
/** Space between the outer ring and the icon centers. */
const ICON_GAP = 32;
/** Height of a percent label (line height + gap to its icon). */
const PCT_H = 13;
/** Extra room at the top so the top axis can carry its percent above the icon. */
const TOP_ROOM = 12;
const SPOKE_START = colors.pink;

/**
 * Trigger radar like the original: nonagon grid, trigger icons around it, a wedge and a
 * glowing spoke per trigger sized by its count, and the relapse count in the middle.
 */
export function RadarChart({ items, relapseCount }: RadarChartProps) {
  const [width, onLayout] = useLayoutWidth();
  const gid = `rd${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const n = items.length;
  const size = Math.min(width, 380);
  const R = Math.max(40, size / 2 - ICON_GAP - ICON / 2 - 4);
  const height = size + 12 + TOP_ROOM;
  const cx = width / 2;
  const cy = (size + 12) / 2 - 4 + TOP_ROOM;
  // Upper axes put their percent above the icon, away from a vertex at ~100% just inside it.
  const labelAbove = (y: number) => y < cy - (R + ICON_GAP) * 0.5;
  const ring = (k: number) => Array.from({ length: n }, (_, i) => polar(cx, cy, (R * k) / RINGS, i, n));
  const vertices = items.map((it, i) => polar(cx, cy, R * it.relative, i, n));
  const active = items.map((it, i) => ({ it, i, def: triggerFor(it.trigger) })).filter((a) => a.it.count > 0);

  return (
    <View onLayout={onLayout} style={{ height: width ? height : 320 }} accessibilityLabel={`Trigger radar, ${relapseCount} relapses`}>
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`${gid}poly`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.danger} stopOpacity={0.22} />
                <Stop offset="1" stopColor={colors.purple} stopOpacity={0.16} />
              </LinearGradient>
              {active.map(({ i, def }) => (
                <LinearGradient key={def.id} id={`${gid}s${i}`} gradientUnits="userSpaceOnUse" x1={cx} y1={cy} x2={vertices[i].x} y2={vertices[i].y}>
                  <Stop offset="0" stopColor={SPOKE_START} stopOpacity={0.9} />
                  <Stop offset="1" stopColor={def.color} stopOpacity={1} />
                </LinearGradient>
              ))}
            </Defs>
            {Array.from({ length: RINGS }, (_, k) => (
              <Polygon key={k} points={pointsAttr(ring(k + 1))} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
            ))}
            {ring(RINGS).map((p, i) => (
              <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            ))}
            {active.map(({ it, i, def }) => (
              <Path key={`w${def.id}`} d={wedgePath(cx, cy, R * it.relative, i, n)} fill={def.color} fillOpacity={0.3} />
            ))}
            {active.length > 2 && (
              <Polygon points={pointsAttr(vertices)} fill={`url(#${gid}poly)`} stroke={withAlpha(colors.danger, 0.25)} strokeWidth={1} />
            )}
            {active.map(({ i, def }) => (
              <G key={`s${def.id}`}>
                <Line
                  x1={cx}
                  y1={cy}
                  x2={vertices[i].x}
                  y2={vertices[i].y}
                  stroke={def.color}
                  strokeOpacity={0.22}
                  strokeWidth={8}
                  strokeLinecap="round"
                />
                <Line x1={cx} y1={cy} x2={vertices[i].x} y2={vertices[i].y} stroke={`url(#${gid}s${i})`} strokeWidth={3} strokeLinecap="round" />
              </G>
            ))}
            {active.map(({ i, def }) => (
              <G key={`d${def.id}`}>
                <Circle cx={vertices[i].x} cy={vertices[i].y} r={9} fill={def.color} fillOpacity={0.25} />
                <Circle cx={vertices[i].x} cy={vertices[i].y} r={5} fill={colors.text} stroke={def.color} strokeWidth={2.5} />
              </G>
            ))}
          </Svg>
          {items.map((it, i) => {
            const def = triggerFor(it.trigger);
            const p = polar(cx, cy, R + ICON_GAP, i, n);
            const on = it.count > 0;
            const above = on && labelAbove(p.y);
            const pct = on ? (
              <Text style={[styles.pct, above ? styles.pctAbove : styles.pctBelow]} color={def.color} tabular>
                {roundPercent(it.relative)}
              </Text>
            ) : null;
            return (
              <View key={def.id} pointerEvents="none" style={[styles.iconWrap, { left: p.x - 30, top: p.y - ICON / 2 - (above ? PCT_H : 0) }]}>
                {above ? pct : null}
                <View style={[styles.icon, { backgroundColor: withAlpha(def.color, on ? 0.22 : 0.08) }]}>
                  <Icon name={def.icon} size={15} color={on ? def.color : withAlpha(def.color, 0.4)} />
                </View>
                {above ? null : pct}
              </View>
            );
          })}
          <View pointerEvents="none" style={[styles.center, { left: cx - 50, top: cy - 26 }]}>
            <Text style={styles.count} tabular>
              {relapseCount}
            </Text>
            <Text variant="micro" tone="tertiary" style={styles.caption}>
              {relapseCount === 1 ? 'relapse' : 'relapses'}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { position: 'absolute', width: 60, alignItems: 'center' },
  icon: { width: ICON, height: ICON, borderRadius: ICON / 2, alignItems: 'center', justifyContent: 'center' },
  pct: { fontSize: 10, lineHeight: PCT_H - 1, fontWeight: '800' },
  pctAbove: { marginBottom: 1 },
  pctBelow: { marginTop: 1 },
  center: { position: 'absolute', width: 100, alignItems: 'center' },
  count: { fontSize: 34, fontWeight: '800', lineHeight: 38, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  caption: { fontSize: 10, letterSpacing: 0.5, marginTop: -2 },
});
