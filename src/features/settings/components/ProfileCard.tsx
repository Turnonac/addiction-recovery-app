import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Icon, Text, TextField } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { plural } from '@/utils/format';
import { SettingsSheet } from './SettingsSheet';

const MAX_NAME = 30;

/** Profile row: avatar initial, name, quick stats. Tapping opens the name editor. */
export function ProfileCard({ habitCount }: { habitCount: number }) {
  const name = useStore((s) => s.settings.userName.trim());
  const [editing, setEditing] = useState(false);
  const initial = name ? name[0].toUpperCase() : '';

  return (
    <>
      <Pressable
        onPress={() => setEditing(true)}
        accessibilityRole="button"
        accessibilityLabel={name ? `Name: ${name}. Edit name` : 'Add your name'}
        testID="settings-profile"
        style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.cardPressed }]}
      >
        <View style={styles.avatar}>
          {initial ? (
            <Text style={styles.initial} color={colors.text}>
              {initial}
            </Text>
          ) : (
            <Icon name="account" size={28} color={colors.accent} />
          )}
        </View>
        <View style={styles.texts}>
          <Text variant="heading" numberOfLines={1}>
            {name || 'Add your name'}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {name ? `Tracking ${plural(habitCount, 'habit')}` : 'Shown on your certificates'}
          </Text>
        </View>
        <View style={styles.edit}>
          <Icon name="pencil-outline" size={16} color={colors.textSecondary} />
        </View>
      </Pressable>
      {editing ? <NameSheet initial={name} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function NameSheet({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  const updateSettings = useStore((s) => s.updateSettings);
  const haptic = useHaptics();
  const trimmed = draft.trim();
  const changed = trimmed !== initial;

  const save = () => {
    if (changed) {
      updateSettings({ userName: trimmed });
      haptic('success');
    }
    onClose();
  };

  return (
    <SettingsSheet
      title="Your name"
      subtitle="Used for greetings, reminders and your certificates."
      onClose={onClose}
      testID="name-sheet"
      footer={<Button label="Save" onPress={save} disabled={!changed} testID="name-save" />}
    >
      <TextField
        value={draft}
        onChangeText={setDraft}
        placeholder="Your name"
        autoFocus
        maxLength={MAX_NAME}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityLabel="Your name"
        hint={`${trimmed.length}/${MAX_NAME}`}
        testID="name-input"
      />
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.accent, 0.22),
    borderWidth: 1,
    borderColor: withAlpha(colors.accent, 0.55),
  },
  initial: { fontSize: 24, fontWeight: '800' },
  texts: { flex: 1, gap: 2 },
  edit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardStrong,
  },
});
