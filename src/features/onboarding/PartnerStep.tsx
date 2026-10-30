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
import { CheckList, StepScreen, TextLink } from '@/features/onboarding/StepLayout';
import { useAppStore } from '@/state/store';
import { Button } from '@/ui/components';

const PARTNER_POINTS = [
  'One person you trust, who will pray with you',
  'Their number stays on this phone',
  'The app never contacts them; you call',
] as const;

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
      title="Who will you call each day?"
      subtitle="Recovery happens in the light. Each day you call this person, share your lowest color, and they pray for you."
      footer={
        <>
          <Button
            title="Continue"
            size="lg"
            onPress={() => void next()}
            disabled={!valid || saving}
            accessibilityHint={valid ? undefined : 'Choose a contact, or type a name and phone number'}
          />
          <TextLink title="Skip for now · Today will remind you" onPress={onNext} disabled={saving} />
        </>
      }
    >
      <CheckList items={PARTNER_POINTS} />
      <PartnerEditor
        value={draft}
        onChange={setDraft}
        showCard={showCard}
        onShowCardChange={setShowCard}
      />
    </StepScreen>
  );
}
