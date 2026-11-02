import { useState } from 'react';
import { Alert } from 'react-native';

import type { Partner } from '@/domain/types';
import type { StepNavProps } from '@/features/onboarding/IntroSteps';
import {
  EMPTY_PARTNER,
  isPartnerValid,
  PartnerEditor,
  samePartner,
} from '@/features/onboarding/PartnerEditor';
import { StepScreen, TextLink } from '@/features/onboarding/StepLayout';
import { useAppStore } from '@/state/store';
import { Button } from '@/ui/components';

/** Step 4 (the most important step, but skippable): who the user calls each day. */
export function PartnerStep({ onNext, onBack }: StepNavProps) {
  const saved = useAppStore((s) => s.settings.partner);
  const setPartner = useAppStore((s) => s.setPartner);
  const [draft, setDraft] = useState<Partner>(saved ?? EMPTY_PARTNER);
  const [showCard, setShowCard] = useState(saved !== null && isPartnerValid(saved));
  const [saving, setSaving] = useState(false);

  const valid = isPartnerValid(draft);

  async function next() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      if (!samePartner(saved, draft)) await setPartner({ name: draft.name, phone: draft.phone });
      onNext();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save", 'Please try again.');
    }
  }

  return (
    <StepScreen
      step={4}
      caption="Step 4 of 6 · The most important step"
      onBack={onBack}
      avoidKeyboard
      title="Who can you call each day?"
      subtitle={`If you haven't already, ask a friend whom you can call every day. Consistency is more important than length of the call. Aim for a one minute call every day. Simply share your lowest color since the last call, and ask your friend to pray for you. Talking in person is another great option, as long as it helps with daily consistency. Remember James 5:16, "Therefore, confess your sins to one another and pray for one another, that you may be healed. The prayer of a righteous person has great power as it is working."`}
      footer={
        <>
          <Button
            title="Continue"
            size="lg"
            onPress={() => void next()}
            disabled={!valid || saving}
            accessibilityHint={valid ? undefined : 'Choose a contact, or type a name and phone number'}
          />
          <TextLink title="Add a friend later" onPress={onNext} disabled={saving} />
        </>
      }
    >
      <PartnerEditor
        value={draft}
        onChange={setDraft}
        showCard={showCard}
        onShowCardChange={setShowCard}
      />
    </StepScreen>
  );
}
