import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Icon, Text, TextField } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { currencySymbol } from '@/utils/format';
import { filterCurrencies } from './currency';
import { Sheet } from './Sheet';

export interface CurrencyButtonProps {
  value: string;
  onChange: (code: string) => void;
}

/** Compact "USD ⌄" pill that opens the searchable currency sheet. */
export function CurrencyButton({ value, onChange }: CurrencyButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Currency: ${value}. Change currency`}
        testID="currency-button"
        style={({ pressed }) => [styles.button, pressed && { backgroundColor: colors.cardPressed }]}
      >
        <Text variant="bodyStrong">{value}</Text>
        <Icon name="chevron-down" size={18} color={colors.textTertiary} />
      </Pressable>
      {open ? (
        <CurrencySheet
          value={value}
          onClose={() => setOpen(false)}
          onSelect={(code) => {
            setOpen(false);
            if (code !== value) onChange(code);
          }}
        />
      ) : null}
    </>
  );
}

interface CurrencySheetProps {
  value: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}

export function CurrencySheet({ value, onClose, onSelect }: CurrencySheetProps) {
  const [query, setQuery] = useState('');
  const haptic = useHaptics();
  const items = filterCurrencies(query);
  return (
    <Sheet title="Currency" subtitle={`Selected: ${value} ${currencySymbol(value)}`} onClose={onClose} tall testID="currency-sheet">
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or code"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search currencies"
      />
      <FlatList
        data={items}
        keyExtractor={(c) => c.code}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="magnify" title="No matches" message={`Nothing matches “${query.trim()}”.`} />}
        renderItem={({ item }) => {
          const active = item.code === value;
          return (
            <Pressable
              onPress={() => {
                haptic('selection');
                onSelect(item.code);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.code}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { backgroundColor: colors.cardPressed }]}
            >
              <View style={[styles.symbol, active && { backgroundColor: withAlpha(colors.accent, 0.2), borderColor: withAlpha(colors.accent, 0.5) }]}>
                <Text variant="bodyStrong" color={active ? colors.text : colors.textSecondary} numberOfLines={1} adjustsFontSizeToFit>
                  {item.symbol}
                </Text>
              </View>
              <View style={styles.texts}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="caption" tone="tertiary" mono>
                  {item.code}
                </Text>
              </View>
              {active ? <Icon name="check-circle" size={22} color={colors.accent} /> : null}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  list: { flex: 1, marginTop: spacing.md },
  listContent: { paddingBottom: spacing.lg, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  rowActive: { backgroundColor: colors.accentSoft },
  symbol: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  texts: { flex: 1, gap: 2 },
});
