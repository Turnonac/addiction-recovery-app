import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import type { Partner } from '@/domain/types';
import {
  EMPTY_PARTNER,
  isPartnerValid,
  PartnerEditor,
  samePartner,
} from '@/features/onboarding/PartnerEditor';
import { useAppStore } from '@/state/store';
import { BackButton, Button, Screen, ScreenHeader } from '@/ui/components';
import { useAppTheme } from '@/ui/theme';

/** Settings › Partner (also opened from Today's "Add your partner" card). */
export default function PartnerScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const saved = useAppStore((s) => s.settings.partner);
  const setPartner = useAppStore((s) => s.setPartner);

  const [draft, setDraft] = useState<Partner>(saved ?? EMPTY_PARTNER);
  const [showCard, setShowCard] = useState(saved !== null && isPartnerValid(saved));
  const [saving, setSaving] = useState(false);

  const changed = !samePartner(saved, draft);
  const canSave = changed && isPartnerValid(draft) && !saving;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await setPartner({ name: draft.name, phone: draft.phone });
      goBack();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save", 'Please try again.');
    }
  }

  function confirmRemove() {
    if (saved === null) return;
    Alert.alert(
      `Remove ${saved.name || 'your partner'}?`,
      'Your history and past check-ins stay. You can add a partner again any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void setPartner(null)
              .then(() => {
                setDraft(EMPTY_PARTNER);
                setShowCard(false);
              })
              .catch(() => Alert.alert("Couldn't remove", 'Please try again.'));
          },
        },
      ],
    );
  }

  const footer = changed ? (
    <Button
      title="Save partner"
      size="lg"
      onPress={() => void save()}
      disabled={!canSave}
      accessibilityHint={isPartnerValid(draft) ? undefined : 'Add a name and a phone number first'}
    />
  ) : undefined;

  return (
    <Screen avoidKeyboard footer={footer} gap={18}>
      {/* Also opened from Today, so the label does not promise Settings. */}
      <BackButton label="Back" onPress={goBack} accessibilityLabel="Go back" />
      <ScreenHeader
        title={saved !== null ? 'Your partner' : 'Add your partner'}
        subtitle="The one person you call each day. You share your lowest color, and they pray for you."
      />

      {saved === null ? (
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
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>No partner yet</Text>
          <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
            Pick someone you trust, who will pray with you. Their number stays on this phone, and
            the app never contacts them. You make the call.
          </Text>
        </View>
      ) : null}

      <PartnerEditor
        value={draft}
        onChange={setDraft}
        showCard={showCard}
        onShowCardChange={setShowCard}
      />

      {saved !== null ? (
        <View style={{ gap: 6, marginTop: 8 }}>
          <Button title="Remove partner" variant="danger" onPress={confirmRemove} />
          <Text style={{ marginHorizontal: 4, color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            Removing your partner keeps your history.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
