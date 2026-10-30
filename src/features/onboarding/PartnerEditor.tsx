/**
 * Partner form shared by onboarding (step 4) and Settings › Partner:
 * "Choose from contacts" (no contacts permission) or type the name and number.
 * Controlled: the parent owns the draft and whether the picked card is shown.
 */
import { useEffect, useRef, useState, type Ref } from 'react';
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
import { formatDialed, sanitizePhone } from '@/services/dialer';
import { Avatar, Button } from '@/ui/components';
import { Users } from '@/ui/icons';
import { MIN_TOUCH, useAppTheme } from '@/ui/theme';

export const EMPTY_PARTNER: Partner = { name: '', phone: '' };

/** A name and a number the phone can dial. */
export function isPartnerValid(p: Partner): boolean {
  return p.name.trim().length > 0 && sanitizePhone(p.phone).length > 0;
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
  const [phoneTouched, setPhoneTouched] = useState(false);

  const dialed = sanitizePhone(value.phone);
  // The exact number Call dials, so a wrong read of an unusual format is caught before saving.
  const callsText = `Calls ${formatDialed(dialed)}`;
  const phoneError =
    phoneTouched && value.phone.trim().length > 0 && dialed.length === 0
      ? 'Enter a number you can call.'
      : undefined;

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
        <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${value.name}, ${callsText}`}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{value.name}</Text>
          <Text style={{ color: theme.muted, fontSize: 14 }}>{callsText}</Text>
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
        onBlur={() => setPhoneTouched(true)}
        placeholder="Phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="done"
        maxLength={40}
        error={phoneError}
        hint={dialed.length > 0 ? callsText : undefined}
      />
    </View>
  );
}

interface FieldProps extends Omit<TextInputProps, 'style' | 'ref'> {
  label: string;
  error?: string;
  /** Muted help text under the input when there is no error. */
  hint?: string;
  ref?: Ref<TextInputInstance>;
}

/**
 * Same look as ui/components TextField (label, 48pt input, 1.5pt border, accent
 * on focus, muted hint), plus a ref so the form can move focus after a contact pick.
 */
function Field({ label, error, hint, ref, onFocus, onBlur, ...inputProps }: FieldProps) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const red = theme.levels[3];
  const borderColor = error ? red.solid : focused ? theme.accent : theme.line2;

  // Same as TextField: the live region only reaches TalkBack, so VoiceOver gets an
  // announcement when an error appears or changes.
  const shownError = useRef(error);
  useEffect(() => {
    if (error === shownError.current) return;
    shownError.current = error;
    if (error && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

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
        accessibilityHint={error ?? hint}
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
          borderColor,
          borderRadius: 12,
        }}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: red.ink, fontSize: 13, lineHeight: 18 }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
