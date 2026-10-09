import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components';
import type { CertificateInfo } from '@/domain/certificates';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { certificateBannerText, certificateHref } from './homeLogic';

/** Gold "Certificate available" banner shown while an earned certificate is unclaimed. */
export function CertificateBanner({ certificate }: { certificate: CertificateInfo }) {
  const haptic = useHaptics();
  const body = certificateBannerText(certificate);
  return (
    <Pressable
      onPress={() => {
        haptic('light');
        router.push(certificateHref(certificate));
      }}
      accessibilityRole="button"
      accessibilityLabel={`Certificate available. ${body}`}
      testID="home-certificate-banner"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[withAlpha(colors.gold, 0.16), withAlpha(colors.gold, 0.04)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={[colors.gold, colors.warning]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.seal}>
        <View style={styles.sealRing}>
          <Icon name="seal-variant" size={24} color={withAlpha(colors.textInverse, 0.6)} />
        </View>
      </LinearGradient>
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          Certificate available
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.body}>
          {body}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color={colors.gold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm + 2,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: withAlpha(colors.gold, 0.45),
    backgroundColor: withAlpha(colors.gold, 0.04),
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  seal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  sealRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: withAlpha(colors.textInverse, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  body: { lineHeight: 17 },
});
