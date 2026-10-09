import { StyleSheet, View } from 'react-native';

import { Text } from './Text';

/** The app mark: a white rounded square with a heavy black "Q". */
export function QLogo({ size = 32, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.26 },
        glow && { shadowColor: '#A78BFA', shadowOpacity: 0.7, shadowRadius: size * 0.6, shadowOffset: { width: 0, height: 0 } },
      ]}
      accessibilityRole="image"
      accessibilityLabel="Quit logo"
    >
      <Text style={{ fontSize: size * 0.62, fontWeight: '900', lineHeight: size * 0.8, marginTop: size * 0.02 }} color="#000000">
        Q
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
