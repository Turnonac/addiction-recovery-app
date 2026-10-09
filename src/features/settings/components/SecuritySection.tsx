import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ListGroup, ListRow, SectionHeader } from '@/components';
import { authenticate, getLockCapability, type LockCapability } from '@/features/lock/biometrics';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { colors } from '@/theme';
import { notify } from '@/utils/confirm';
import { SectionNote } from './SectionNote';
import { SettingSwitch } from './SettingSwitch';

const IS_WEB = Platform.OS === 'web';

export function SecuritySection() {
  const enabled = useStore((s) => s.settings.appLockEnabled);
  const updateSettings = useStore((s) => s.updateSettings);
  const haptic = useHaptics();
  const [capability, setCapability] = useState<LockCapability | null>(null);
  const [pending, setPending] = useState<boolean | null>(null);

  useEffect(() => {
    if (IS_WEB) return;
    let alive = true;
    void getLockCapability().then((c) => alive && setCapability(c));
    return () => {
      alive = false;
    };
  }, []);

  const label = capability?.available ? capability.label : Platform.OS === 'android' ? 'Fingerprint' : 'Face ID';

  const toggle = async (next: boolean) => {
    const cap = await getLockCapability();
    setCapability(cap);
    if (next && !cap.available) {
      haptic('warning');
      notify(`${label} isn’t set up`, 'Set up Face ID, Touch ID, a fingerprint or a device passcode in your system Settings, then try again.');
      return;
    }
    // If the device lost its passcode/biometrics, let the user turn the lock off without a prompt.
    if (!next && !cap.available) {
      updateSettings({ appLockEnabled: false });
      return;
    }
    setPending(next);
    const ok = await authenticate(next ? `Turn on ${cap.label} lock` : `Turn off ${cap.label} lock`);
    setPending(null);
    if (ok) {
      haptic('success');
      updateSettings({ appLockEnabled: next });
    }
  };

  return (
    <>
      <SectionHeader title="Privacy & security" icon="shield-lock-outline" />
      <ListGroup>
        <ListRow
          title={IS_WEB ? 'Lock with Face ID / Passcode' : `Lock with ${label}`}
          subtitle={IS_WEB ? 'Ask to unlock when opening Quit' : `Ask for ${label} when opening Quit`}
          icon={capability?.icon ?? 'face-recognition'}
          iconColor={colors.success}
          right={
            <SettingSwitch
              value={pending ?? enabled}
              onChange={(v) => void toggle(v)}
              disabled={IS_WEB}
              accessibilityLabel={`Lock with ${label}`}
              testID="settings-app-lock"
            />
          }
        />
      </ListGroup>
      <SectionNote
        text={
          IS_WEB
            ? 'App lock is available in the iOS and Android app. Your data never leaves this device.'
            : 'Quit also hides its content in the app switcher. Your data never leaves this device.'
        }
        icon={IS_WEB ? 'information-outline' : 'shield-check-outline'}
      />
    </>
  );
}
