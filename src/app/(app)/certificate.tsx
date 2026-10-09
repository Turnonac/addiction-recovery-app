import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, Header, Screen, Text } from '@/components';
import { milestoneLabel } from '@/domain/milestones';
import { CertificateCard } from '@/features/achievements/CertificateCard';
import { LockedCertificate } from '@/features/achievements/LockedCertificate';
import { certificateShareText, certificateStatus, isCertificateDays, titleCase } from '@/features/achievements/certificateLogic';
import { shareCapture } from '@/features/achievements/share';
import { useHaptics } from '@/hooks/useHaptics';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/store';
import { useHabit } from '@/store/selectors';
import { colors, spacing } from '@/theme';
import { formatDate } from '@/utils/format';

const JUST_NOW = 5 * 60_000;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function CertificateScreen() {
  const params = useLocalSearchParams<{ habitId?: string; days?: string }>();
  const habit = useHabit(params.habitId);
  const days = Number(params.days);
  const validDays = isCertificateDays(days);
  const relapses = useStore((s) => s.relapses);
  const unlocks = useStore((s) => s.unlocks);
  const userName = useStore((s) => s.settings.userName);
  const claimCertificate = useStore((s) => s.claimCertificate);
  const now = useNow(60_000);
  const haptic = useHaptics();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const status = habit && validDays ? certificateStatus(habit, relapses, unlocks, days, now) : null;
  const shouldClaim = !!status?.shouldClaim;
  const statusKey = status?.key;

  useEffect(() => {
    if (shouldClaim && statusKey) {
      claimCertificate(statusKey, now);
      haptic('success');
    }
  }, [shouldClaim, statusKey, claimCertificate, haptic, now]);

  const header = <Header title="Certificate" left="close" />;

  if (!habit || !validDays || !status) {
    return (
      <Screen header={header} glowColor={colors.gold} glowIntensity={0.25}>
        <EmptyState
          icon="certificate-outline"
          title="Certificate not found"
          message={
            habit
              ? 'Certificates are awarded at 1 week, 1 month, 3 months, 6 months and 1 year.'
              : "This certificate isn't available — the habit may have been removed."
          }
          color={colors.gold}
        />
        <Button label="Go back" fullWidth={false} style={styles.centerButton} onPress={close} />
      </Screen>
    );
  }

  const title = titleCase(milestoneLabel(days));

  if (!status.earned) {
    return (
      <Screen header={header} glowColor={habit.color} glowIntensity={0.3}>
        <LockedCertificate title={title} habitName={habit.name} color={habit.color} daysToGo={status.daysToGo} progress={status.progress} unlocksAt={status.unlocksAt} />
        <View style={styles.actions}>
          <Button label="Done" onPress={close} />
        </View>
      </Screen>
    );
  }

  const share = async () => {
    setSharing(true);
    try {
      await shareCapture(cardRef, certificateShareText(days, milestoneLabel(days), habit.name), 'Share certificate');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen header={header} glowColor={colors.gold} glowIntensity={0.3}>
      <CertificateCard
        viewRef={cardRef}
        title={title}
        habitName={habit.name}
        recipient={userName.trim() || 'You'}
        earnedAt={status.earnedAt ?? now}
        days={days}
      />
      <Text variant="caption" tone="tertiary" center style={styles.note}>
        {!status.claimedAt || status.claimedAt > now - JUST_NOW ? 'Just received — congratulations! 🎉' : `Received ${formatDate(status.claimedAt)}`}
      </Text>
      <View style={styles.actions}>
        <Button label="Share certificate" icon="export-variant" onPress={() => void share()} loading={sharing} />
        <Button label="Done" variant="secondary" onPress={close} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: spacing.md },
  centerButton: { alignSelf: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
