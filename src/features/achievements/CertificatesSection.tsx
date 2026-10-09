import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, SectionHeader, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { formatDate } from '@/utils/format';
import { titleCase, type CertificateListItem } from './certificateLogic';

export interface CertificatesSectionProps {
  items: CertificateListItem[];
}

/** "CERTIFICATES" list: new (unclaimed) ones first, then received ones. */
export function CertificatesSection({ items }: CertificatesSectionProps) {
  const fresh = items.filter((i) => i.isNew).length;
  return (
    <View>
      <SectionHeader
        title="Certificates"
        icon="certificate-outline"
        right={
          items.length ? (
            <Text variant="captionStrong" tone="tertiary" tabular>
              {items.length}
              {fresh ? ` · ${fresh} new` : ''}
            </Text>
          ) : undefined
        }
      />
      {items.length ? (
        <View style={styles.group}>
          {items.map((c, i) => (
            <CertificateRow key={c.key} item={c} first={i === 0} />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="certificate-outline" size={22} color={colors.textTertiary} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">No certificates yet</Text>
            <Text variant="caption" tone="secondary">
              Your first certificate unlocks after 1 week clean.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function CertificateRow({ item, first }: { item: CertificateListItem; first: boolean }) {
  const title = `${titleCase(item.label)} · ${item.habitName}`;
  return (
    <Pressable
      onPress={() => router.push(`/certificate?habitId=${encodeURIComponent(item.habitId)}&days=${item.days}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} free from ${item.habitName} certificate${item.isNew ? ', new' : ''}`}
      style={({ pressed }) => [styles.row, !first && styles.separator, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <View style={styles.seal}>
        <LinearGradient
          colors={[withAlpha(colors.text, 0.85), colors.gold, withAlpha(colors.gold, 0.7)]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.sealFill, !item.isNew && styles.sealDim]}
        />
        <Icon name="seal-variant" size={20} color={colors.bg} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {item.isNew ? 'Tap to receive your certificate' : `Received ${formatDate(item.claimedAt ?? 0)}`}
        </Text>
      </View>
      {item.isNew ? (
        <View style={styles.newBadge}>
          <Text variant="micro" color={colors.textInverse} style={styles.newText}>
            New
          </Text>
        </View>
      ) : null}
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 64 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  seal: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sealFill: { borderRadius: 20 },
  sealDim: { opacity: 0.75 },
  newBadge: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.sm, height: 20, justifyContent: 'center' },
  newText: { textTransform: 'uppercase', letterSpacing: 1, fontWeight: '800' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  emptyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
});
