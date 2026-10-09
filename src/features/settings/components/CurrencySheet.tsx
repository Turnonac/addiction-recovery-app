import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Icon, Text, TextField } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { currencyInfo, currencyLabel, filterCurrencies } from '../logic/currency';
import { SettingsSheet } from './SettingsSheet';

export interface CurrencySheetProps {
  value: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}

/** Searchable currency list (symbol tile, name, code). */
export function CurrencySheet({ value, onClose, onSelect }: CurrencySheetProps) {
  const [query, setQuery] = useState('');
  const haptic = useHaptics();
  const items = filterCurrencies(query);
  const current = currencyInfo(value);

  return (
    <SettingsSheet title="Default currency" subtitle={`Used for new habits · ${currencyLabel(current)}`} onClose={onClose} tall testID="currency-sheet">
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, code or symbol"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search currencies"
        testID="currency-search"
      />
      <FlatList
        data={items}
        keyExtractor={(c) => c.code}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
              testID={`currency-${item.code}`}
              style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { backgroundColor: colors.cardPressed }]}
            >
              <View style={[styles.symbol, active && styles.symbolActive]}>
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
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, marginTop: spacing.md },
  listContent: { paddingBottom: spacing.lg, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg },
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
  symbolActive: { backgroundColor: withAlpha(colors.accent, 0.2), borderColor: withAlpha(colors.accent, 0.5) },
  texts: { flex: 1, gap: 2 },
});
