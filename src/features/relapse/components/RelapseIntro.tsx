import { StyleSheet, View } from 'react-native';

import { Card, Icon, IconTile, Text } from '@/components';
import { colors, spacing } from '@/theme';
import type { IconName } from '@/types';
import type { PreviewLine } from '../relapseLogic';

const LINE_ICONS: Record<PreviewLine['kind'], { icon: IconName; color: string }> = {
  saved: { icon: 'content-save-outline', color: colors.info },
  record: { icon: 'trophy-outline', color: colors.gold },
  attempt: { icon: 'flag-outline', color: colors.fire },
};

export interface RelapseIntroProps {
  color: string;
  lines: PreviewLine[];
}

/** Compassionate opener plus what logging will do (streak saved, record, next attempt). */
export function RelapseIntro({ color, lines }: RelapseIntroProps) {
  return (
    <Card tint={color} tintStrength={0.07} testID="relapse-intro">
      <View style={styles.head}>
        <IconTile icon="hand-heart-outline" color={color} size={44} shape="circle" />
        <Text variant="subheading" style={styles.title}>
          Slips happen. What matters is what you do next.
        </Text>
      </View>
      <View style={styles.lines}>
        {lines.map((l) => (
          <View key={l.kind} style={styles.line}>
            <Icon name={LINE_ICONS[l.kind].icon} size={16} color={LINE_ICONS[l.kind].color} />
            <Text variant="body" tone="secondary" style={styles.lineText}>
              {l.text}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, lineHeight: 22 },
  lines: { marginTop: spacing.md, gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lineText: { flex: 1, lineHeight: 20, marginTop: -2 },
});
