import { StyleSheet, View } from 'react-native';

import { QLogo, Text } from '@/components';
import { spacing } from '@/theme';
import { appVersion } from '../appInfo';

export function SettingsFooter() {
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Quit version ${appVersion()}. Made with care. Your data stays on this device.`}>
      <QLogo size={28} />
      <Text variant="captionStrong" tone="secondary" style={styles.title}>
        Quit · v{appVersion()}
      </Text>
      <Text variant="caption" tone="tertiary" center>
        Made with care. Your data stays on this device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxxl, opacity: 0.9 },
  title: { marginTop: spacing.sm },
});
