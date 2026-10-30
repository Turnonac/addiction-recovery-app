/**
 * Partner form shared by onboarding (step 4) and Settings › Partner:
 * "Choose from contacts" (no contacts permission) or type the name and number.
 * Controlled: the parent owns the draft and whether the picked card is shown.
 */
import { useRef, useState, type Ref } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';

import type { Partner } from '@/domain/types';
import { pickPartnerContact } from '@/services/contacts';
import { Avatar, Button } from '@/ui/components';
import { Users } from '@/ui/icons';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';

export const EMPTY_PARTNER: Partner = { name: '', phone: '' };

/** A name and a number. The number is saved and dialed exactly as entered. */
export function isPartnerValid(p: Partner): boolean {
  return p.name.trim().length > 0 && p.phone.trim().length > 0;
}

export function samePartner(a: Partner | null, b: Partner | null): boolean {
  if (a === null || b === null) return a === b;
  return a.name.trim() === b.name.trim() && a.phone.trim() === b.phone.trim();
}

export interface PartnerEditorProps {
  value: Partner;
  onChange: (partner: Partner) => void;
  /** Show the compact "picked" card (with Change) instead of the form. Needs a valid value. */
  showCard: boolean;
  onShowCardChange: (show: boolean) => void;
}

export function PartnerEditor({ value, onChange, showCard, onShowCardChange }: PartnerEditorProps) {
  const theme = useAppTheme();
  const nameRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const showNotice = (message: string) => {
    setNotice(message);
    // The notice's accessibilityLiveRegion covers TalkBack; VoiceOver needs an announcement.
    // High priority (iOS 17+) so the picker closing and the focus move below can't cut it off.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, { priority: 'high' });
    }
  };

  const choose = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await pickPartnerContact();
      if (result.status === 'picked') {
        const picked = result.partner;
        onChange(picked);
        if (isPartnerValid(picked)) {
          setNotice(null);
          onShowCardChange(true);
        } else if (picked.name.trim().length === 0) {
          showNotice('That contact has no name. Type one below.');
          nameRef.current?.focus();
        } else {
          showNotice('That contact has no phone number. Type it below.');
          phoneRef.current?.focus();
        }
      } else if (result.status === 'unavailable') {
        showNotice("Contacts can't be opened here. Type the name and number instead.");
        nameRef.current?.focus();
      }
    } finally {
      setPicking(false);
    }
  };

  if (showCard && isPartnerValid(value)) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: theme.surface,
          borderWidth: 2,
          borderColor: theme.accent,
          borderRadius: theme.radius,
        }}
      >
        <Avatar name={value.name} size={44} />
        <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${value.name}, ${value.phone}`}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{value.name}</Text>
          <Text style={{ color: theme.muted, fontSize: 14 }}>{value.phone}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change partner, currently ${value.name}`}
          onPress={() => onShowCardChange(false)}
          hitSlop={4}
          style={({ pressed }) => ({
            minHeight: MIN_TOUCH,
            paddingHorizontal: 8,
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: theme.accentText, fontSize: 15, fontWeight: '700' }}>Change</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Button
        title="Choose from contacts"
        icon={Users}
        onPress={() => void choose()}
        disabled={picking}
      />
      {notice !== null ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.text, fontSize: 14, lineHeight: 20, textAlign: 'center' }}
        >
          {notice}
        </Text>
      ) : null}
      <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>or type it in</Text>
      <Field
        ref={nameRef}
        label="Name"
        value={value.name}
        onChangeText={(name) => onChange({ ...value, name })}
        placeholder="Partner's name"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
        maxLength={80}
      />
      <Field
        ref={phoneRef}
        label="Phone"
        value={value.phone}
        onChangeText={(phone) => onChange({ ...value, phone })}
        placeholder="Phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="done"
        maxLength={40}
      />
    </View>
  );
}

interface FieldProps extends Omit<TextInputProps, 'style' | 'ref'> {
  label: string;
  ref?: Ref<TextInputInstance>;
}

/**
 * Same look as ui/components TextField (label, 48pt input, 1.5pt border, accent
 * on focus), plus a ref so the form can move focus after a contact pick.
 */
function Field({ label, ref, onFocus, onBlur, ...inputProps }: FieldProps) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {label}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.muted}
        selectionColor={theme.accent}
        cursorColor={theme.accent}
        underlineColorAndroid="transparent"
        {...inputProps}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 16,
          color: theme.text,
          backgroundColor: theme.surface,
          borderWidth: 1.5,
          borderColor: focused ? theme.accent : theme.line2,
          borderRadius: 12,
        }}
      />
    </View>
  );
}
