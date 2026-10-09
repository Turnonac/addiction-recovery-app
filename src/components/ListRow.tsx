import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { colors, radius, spacing, withAlpha } from '@/theme';
import type { IconName } from '@/types';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  /** Right-side value text. */
  value?: string;
  /** Show a switch; `onToggle` receives the new value. */
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  right?: ReactNode;
  /** Hide chevron for pressable rows. */
  noChevron?: boolean;
  /** Dims the row and disables its switch / press. */
  disabled?: boolean;
  testID?: string;
}

/** Settings-style row. Group several inside <ListGroup>. */
export function ListRow({ title, subtitle, icon, iconColor = colors.accent, value, toggle, onToggle, onPress, destructive, right, noChevron, disabled, testID }: ListRowProps) {
  const fg = destructive ? colors.danger : colors.text;
  const content = (
    <View style={[styles.row, disabled && styles.disabled]}>
      {icon && (
        <View style={[styles.icon, { backgroundColor: withAlpha(destructive ? colors.danger : iconColor, 0.18) }]}>
          <Icon name={icon} size={18} color={destructive ? colors.danger : iconColor} />
        </View>
      )}
      <View style={styles.texts}>
        <Text variant="bodyStrong" color={fg}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="secondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {right}
      {toggle != null ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: colors.cardStrong, true: colors.accent }}
          thumbColor={colors.text}
          {...({ activeThumbColor: colors.text } as object)}
          accessibilityLabel={title}
        />
      ) : onPress && !noChevron ? (
        <Icon name="chevron-right" size={20} color={colors.textTertiary} />
      ) : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} testID={testID} style={({ pressed }) => pressed && { backgroundColor: colors.cardPressed }}>
      {content}
    </Pressable>
  );
}

/** Rounded container that separates rows with hairlines. */
export function ListGroup({ children }: { children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={styles.group}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.sep} />}
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56 },
  icon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  value: { flexShrink: 1, maxWidth: '45%' },
  disabled: { opacity: 0.45 },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
});
