import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { colors, spacing } from '@/theme';

/** Bulleted list of the week's highlights. */
export function Highlights({ items }: { items: string[] }) {
  if (!items.length) {
    return (
      <Card>
        <Text variant="body" tone="secondary" center>
          A quiet week. Stay clean, use SOS when cravings hit, or write in your journal — your highlights will show up here.
        </Text>
      </Card>
    );
  }
  return (
    <Card padding={0}>
      {items.map((text, i) => (
        <View key={`${i}-${text}`} style={[styles.row, i > 0 && styles.separator]}>
          <View style={styles.bullet}>
            <Icon name="star-four-points" size={13} color={colors.gold} />
          </View>
          <Text variant="body" style={styles.text}>
            {text}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bullet: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldSoft },
  text: { flex: 1 },
});
