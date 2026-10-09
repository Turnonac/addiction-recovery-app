import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, IconTile, Text } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { CRISIS_RESOURCES, type CrisisResource, type ResourceAction } from '../logic/support';
import { openLink } from '../openLink';
import { SettingsSheet } from './SettingsSheet';

const TONES: Record<CrisisResource['tone'], string> = {
  danger: colors.danger,
  info: colors.info,
  success: colors.success,
  purple: colors.purple,
};

/** Supportive message plus general crisis resources with tap-to-call / open links. */
export function CrisisSheet({ onClose }: { onClose: () => void }) {
  return (
    <SettingsSheet title="If you’re in crisis" onClose={onClose} tall testID="crisis-sheet">
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heart}>
            <Icon name="hand-heart" size={26} color={colors.pink} />
          </View>
          <Text variant="bodyStrong" style={styles.heroTitle}>
            You’re not alone.
          </Text>
          <Text variant="body" tone="secondary" style={styles.heroText}>
            Cravings and setbacks can feel overwhelming, and reaching out is a sign of strength. If you’re thinking about harming yourself or you’re in
            danger, please contact someone right now.
          </Text>
        </View>
        {CRISIS_RESOURCES.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
        <Text variant="caption" tone="tertiary" center style={styles.footnote}>
          Quit is a self-help tool and not a substitute for professional care. Helplines listed are for general information.
        </Text>
      </ScrollView>
    </SettingsSheet>
  );
}

function ResourceCard({ resource }: { resource: CrisisResource }) {
  const color = TONES[resource.tone];
  return (
    <View style={styles.card} testID={`crisis-${resource.id}`}>
      <View style={styles.cardTop}>
        <IconTile icon={resource.icon} color={color} size={40} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{resource.title}</Text>
          <Text variant="captionStrong" color={color} tabular>
            {resource.detail}
          </Text>
        </View>
      </View>
      <Text variant="caption" tone="secondary" style={styles.description}>
        {resource.description}
      </Text>
      {resource.actions.length ? (
        <View style={styles.actions}>
          {resource.actions.map((a) => (
            <ActionButton key={a.url} action={a} color={color} resource={resource} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({ action, color, resource }: { action: ResourceAction; color: string; resource: CrisisResource }) {
  return (
    <Pressable
      onPress={() => void openLink(action.url, `${resource.title}: ${resource.detail}`)}
      accessibilityRole={action.url.startsWith('http') ? 'link' : 'button'}
      accessibilityLabel={`${action.label} ${resource.title}`}
      style={({ pressed }) => [styles.action, { backgroundColor: withAlpha(color, pressed ? 0.3 : 0.18), borderColor: withAlpha(color, 0.45) }]}
    >
      <Icon name={action.icon} size={16} color={color} />
      <Text variant="captionStrong" color={colors.text}>
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  heart: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.pink, 0.16),
    borderWidth: 1,
    borderColor: withAlpha(colors.pink, 0.4),
    marginBottom: spacing.md,
  },
  heroTitle: { fontSize: 17, marginBottom: spacing.xs },
  heroText: { textAlign: 'center', lineHeight: 21 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  description: { lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footnote: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, lineHeight: 18 },
});
