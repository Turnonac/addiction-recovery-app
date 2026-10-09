import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components';
import type { HabitSnapshot } from '@/domain/habitStats';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, radius } from '@/theme';
import { notify } from '@/utils/confirm';
import { shareImage, shareText, supportsImageShare } from './platformShare';
import { ShareCard } from './ShareCard';
import { shareMessage, shareTitle } from './shareContent';
import { SHARE_CAPTURE_WIDTH } from './shareSize';

export interface ShareHabitButtonProps {
  snapshot: HabitSnapshot;
  size?: number;
}

interface PendingCapture {
  snapshot: HabitSnapshot;
  at: number;
}

/**
 * Round glass button that shares a habit's progress. On iOS/Android it renders
 * a ShareCard off-screen, captures it as an image and opens the share sheet; on
 * web it shares a text message instead.
 */
export function ShareHabitButton({ snapshot, size = 32 }: ShareHabitButtonProps) {
  const haptic = useHaptics();
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);
  const capturing = useRef(false);

  const message = shareMessage(snapshot);
  const title = shareTitle(snapshot);

  const finish = () => {
    capturing.current = false;
    setPending(null);
    setBusy(false);
  };

  const shareAsText = async () => {
    try {
      await shareText(message, title);
    } catch {
      notify('Could not share', 'Sharing is not available on this device right now.');
    }
  };

  const onPress = () => {
    if (busy) return;
    haptic('light');
    if (supportsImageShare) {
      // Mount the off-screen card; capture starts once it has been laid out.
      setBusy(true);
      setPending({ snapshot, at: Date.now() });
      return;
    }
    setBusy(true);
    void shareAsText().finally(() => setBusy(false));
  };

  const onCardLayout = () => {
    if (capturing.current) return;
    capturing.current = true;
    // Give the native views one frame to draw before taking the snapshot.
    requestAnimationFrame(() => {
      void (async () => {
        try {
          const shared = await shareImage(cardRef, title);
          if (!shared) await shareAsText();
        } catch {
          await shareAsText();
        } finally {
          finish();
        }
      })();
    });
  };

  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`Share ${snapshot.habit.name} progress`}
        accessibilityState={{ busy, disabled: busy }}
        hitSlop={8}
        testID={`share-${snapshot.habit.id}`}
        style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && styles.pressed]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Icon name="export-variant" size={Math.round(size * 0.5)} color={colors.textSecondary} />
        )}
      </Pressable>
      {pending ? (
        <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View ref={cardRef} collapsable={false} onLayout={onCardLayout} style={styles.capture}>
            <ShareCard snapshot={pending.snapshot} now={pending.at} width={SHARE_CAPTURE_WIDTH} rounded={false} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  pressed: { opacity: 0.7 },
  // Laid out at the capture width so the native snapshot is exactly 1080 px wide.
  offscreen: { position: 'absolute', top: 0, left: -10000, width: SHARE_CAPTURE_WIDTH },
  capture: { width: SHARE_CAPTURE_WIDTH, backgroundColor: colors.bg },
});
