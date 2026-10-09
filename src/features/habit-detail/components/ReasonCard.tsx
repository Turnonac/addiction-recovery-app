import { StyleSheet, View } from 'react-native';

import { Card, Icon, SectionHeader, Text } from '@/components';
import { spacing, withAlpha } from '@/theme';

export interface ReasonCardProps {
  reason: string;
  color: string;
}

/** "WHY I QUIT" — the user's own reason, shown as a quote. */
export function ReasonCard({ reason, color }: ReasonCardProps) {
  const text = reason.trim();
  if (!text) return null;
  return (
    <View>
      <SectionHeader icon="heart-outline" title="WHY I QUIT" />
      <Card tint={color} tintStrength={0.06} accessibilityLabel={`Why I quit: ${text}`}>
        <View style={styles.row}>
          <View style={[styles.quote, { backgroundColor: withAlpha(color, 0.16) }]}>
            <Icon name="format-quote-open" size={22} color={color} />
          </View>
          <Text variant="body" style={styles.text}>
            {text}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  quote: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 16, lineHeight: 23, fontStyle: 'italic', paddingTop: 6 },
});
