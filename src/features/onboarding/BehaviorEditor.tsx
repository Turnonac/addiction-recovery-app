/**
 * "My colors" editor: one card per color with the user's behavior chips,
 * a dashed Add chip, and a small cross-platform edit sheet (Alert.prompt is
 * iOS-only). Used by Settings › My colors and the onboarding color pages.
 * Writes go straight to the store (lists start empty; Red's locked line is
 * shown first and never stored).
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  COLOR_MEANINGS,
  COLOR_NAMES,
  LOCKED_RED_LINE,
  RED,
  type Behavior,
  type ColorLevel,
} from '@/domain/types';
import { BEHAVIOR_MAX_LENGTH, useAppStore } from '@/state/store';
import { AddChip, Button, Chip, ChipList, ColorGlyph } from '@/ui/components';
import { useAppTheme } from '@/ui/theme';

type EditTarget = { kind: 'add'; level: ColorLevel } | { kind: 'edit'; behavior: Behavior };

export interface ColorBehaviorsCardProps {
  level: ColorLevel;
  behaviors: readonly Behavior[];
  onAdd: () => void;
  onEdit: (behavior: Behavior) => void;
}

/** One color's section: glyph, name, fixed meaning, chips, Add. */
export function ColorBehaviorsCard({ level, behaviors, onAdd, onEdit }: ColorBehaviorsCardProps) {
  const theme = useAppTheme();
  const name = COLOR_NAMES[level];
  return (
    <View
      style={{
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: theme.radius,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ColorGlyph level={level} size={30} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
            {name}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>{COLOR_MEANINGS[level]}</Text>
        </View>
      </View>
      <ChipList>
        {level === RED ? <Chip label={LOCKED_RED_LINE} level={level} locked /> : null}
        {behaviors.map((b) => (
          <Chip
            key={b.id}
            label={b.text}
            level={level}
            onPress={() => onEdit(b)}
            accessibilityLabel={`Edit: ${b.text}`}
          />
        ))}
        <AddChip onPress={onAdd} accessibilityLabel={`Add a ${name} behavior`} />
      </ChipList>
    </View>
  );
}

export interface BehaviorEditorProps {
  /** Which colors to show, in order. */
  levels: readonly ColorLevel[];
}

/** Store-connected list of color cards plus the add / edit sheet. */
export function BehaviorEditor({ levels }: BehaviorEditorProps) {
  const behaviors = useAppStore((s) => s.behaviors);
  const [target, setTarget] = useState<EditTarget | null>(null);

  return (
    <>
      {levels.map((level) => (
        <ColorBehaviorsCard
          key={level}
          level={level}
          behaviors={behaviors.filter((b) => b.color === level)}
          onAdd={() => setTarget({ kind: 'add', level })}
          onEdit={(behavior) => setTarget({ kind: 'edit', behavior })}
        />
      ))}
      <BehaviorSheet target={target} onClose={() => setTarget(null)} />
    </>
  );
}

interface BehaviorSheetProps {
  target: EditTarget | null;
  onClose: () => void;
}

function BehaviorSheet({ target, onClose }: BehaviorSheetProps) {
  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
    >
      {target !== null ? (
        <BehaviorSheetBody
          key={target.kind === 'edit' ? `e${target.behavior.id}` : `a${target.level}`}
          target={target}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function BehaviorSheetBody({ target, onClose }: { target: EditTarget; onClose: () => void }) {
  const theme = useAppTheme();
  const addBehavior = useAppStore((s) => s.addBehavior);
  const updateBehavior = useAppStore((s) => s.updateBehavior);
  const removeBehavior = useAppStore((s) => s.removeBehavior);

  const level = target.kind === 'add' ? target.level : target.behavior.color;
  const name = COLOR_NAMES[level];
  const [text, setText] = useState(target.kind === 'edit' ? target.behavior.text : '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const canSave = text.trim().length > 0 && !busy;
  const title = target.kind === 'add' ? `Add a ${name} behavior` : `Edit ${name} behavior`;

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await task();
      onClose();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const save = () => {
    if (!canSave) return;
    void run(() =>
      target.kind === 'add' ? addBehavior(level, text) : updateBehavior(target.behavior.id, text),
    );
  };

  const remove = () => {
    if (target.kind !== 'edit') return;
    void run(() => removeBehavior(target.behavior.id));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'center', padding: 20 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
      />
      <View
        accessibilityViewIsModal
        style={{
          gap: 14,
          padding: 20,
          backgroundColor: theme.surface,
          borderRadius: theme.radius,
          borderWidth: 1,
          borderColor: theme.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ColorGlyph level={level} size={26} />
          <Text
            accessibilityRole="header"
            style={{ flex: 1, color: theme.text, fontSize: 18, fontWeight: '700' }}
          >
            {title}
          </Text>
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          maxLength={BEHAVIOR_MAX_LENGTH}
          placeholder="A few words"
          placeholderTextColor={theme.muted}
          selectionColor={theme.accent}
          cursorColor={theme.accent}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={save}
          multiline
          accessibilityLabel={`${name} behavior`}
          accessibilityHint="A short example of what this color looks like for you."
          style={{
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: theme.text,
            backgroundColor: theme.surface,
            borderWidth: 1.5,
            borderColor: theme.line2,
            borderRadius: 12,
            textAlignVertical: 'top',
          }}
        />
        {failed ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: theme.levels[RED].ink, fontSize: 13, lineHeight: 18 }}
          >
            That didn&apos;t save. Please try again.
          </Text>
        ) : null}
        <Button title="Save" onPress={save} disabled={!canSave} />
        {target.kind === 'edit' ? (
          <Button
            title="Delete"
            variant="danger"
            onPress={remove}
            disabled={busy}
            accessibilityLabel={`Delete: ${target.behavior.text}`}
          />
        ) : null}
        <Button title="Cancel" variant="ghost" onPress={onClose} />
      </View>
    </KeyboardAvoidingView>
  );
}

