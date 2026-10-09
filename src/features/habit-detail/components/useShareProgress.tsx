import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { HabitSnapshot } from '@/domain/habitStats';
import { shareImage, shareText, supportsImageShare } from '@/features/share/platformShare';
import { SHARE_CARD_WIDTH, ShareCard } from '@/features/share/ShareCard';
import { shareMessage, shareTitle } from '@/features/share/shareContent';
import { colors } from '@/theme';
import { notify } from '@/utils/confirm';

interface Pending {
  snapshot: HabitSnapshot;
  at: number;
}

export interface ShareProgress {
  share: (snapshot: HabitSnapshot) => void;
  busy: boolean;
  /** Off-screen card used for the image capture; render it anywhere in the tree. */
  capture: ReactNode;
}

/**
 * Same behavior as the home card's share button, triggered from the detail menu:
 * on iOS/Android an off-screen ShareCard is captured and shared as an image; on
 * web (or if capture fails) a text message is shared instead.
 */
export function useShareProgress(): ShareProgress {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);
  const capturing = useRef(false);
  const busyRef = useRef(false);

  const done = () => {
    capturing.current = false;
    busyRef.current = false;
    setPending(null);
    setBusy(false);
  };

  const asText = async (s: HabitSnapshot) => {
    try {
      await shareText(shareMessage(s), shareTitle(s));
    } catch {
      notify('Could not share', 'Sharing is not available on this device right now.');
    }
  };

  const share = (s: HabitSnapshot) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    if (supportsImageShare) {
      setPending({ snapshot: s, at: Date.now() });
      return;
    }
    void asText(s).finally(done);
  };

  const onCardLayout = () => {
    if (capturing.current || !pending) return;
    capturing.current = true;
    const s = pending.snapshot;
    requestAnimationFrame(() => {
      void (async () => {
        try {
          const ok = await shareImage(cardRef, shareTitle(s));
          if (!ok) await asText(s);
        } catch {
          await asText(s);
        } finally {
          done();
        }
      })();
    });
  };

  const capture = pending ? (
    <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View ref={cardRef} collapsable={false} onLayout={onCardLayout} style={styles.card}>
        <ShareCard snapshot={pending.snapshot} now={pending.at} rounded={false} />
      </View>
    </View>
  ) : null;

  return { share, busy, capture };
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', top: 0, left: -10000, width: SHARE_CARD_WIDTH },
  card: { width: SHARE_CARD_WIDTH, backgroundColor: colors.bg },
});
