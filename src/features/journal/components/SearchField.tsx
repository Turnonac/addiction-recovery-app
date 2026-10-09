import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components';
import { colors, radius, spacing, withAlpha } from '@/theme';

export interface SearchFieldProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

/** Compact search bar with a magnifier and a clear button. */
export function SearchField({ value, onChange, placeholder = 'Search entries' }: SearchFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.focused]}>
      <Icon name="magnify" size={18} color={focused ? colors.text : colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Search journal entries"
        testID="journal-search"
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search" style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Icon name="close-circle" size={18} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  focused: { borderColor: withAlpha(colors.accent, 0.7), backgroundColor: colors.cardStrong },
  // outlineWidth: no browser focus rectangle inside the rounded field (the border shows focus).
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 0, height: '100%', outlineWidth: 0 },
});
