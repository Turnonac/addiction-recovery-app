import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, SectionHeader, Text } from '@/components';
import { DAY } from '@/domain/time';
import { colors, spacing, withAlpha } from '@/theme';
import { formatDurationShort } from '@/utils/format';
import { badgeDate, focusIndex, milestoneBadges, stripScrollX, type MilestoneBadge } from '../logic';
import { ArcRing } from './ArcRing';

export interface MilestonesStripProps {
  habitId: string;
  color: string;
  startedAt: number;
  /** Coarse current time. */
  now: number;
}

const BADGE = 54;
const ITEM_WIDTH = 66;
const GAP = spacing.sm;

/**
 * "MILESTONES" — a horizontal row of round badges (1d … 1y). Reached ones are
 * filled with the habit color; the next one shows progress; certificate
 * milestones that were reached open their certificate.
 */
export function MilestonesStrip({ habitId, color, startedAt, now }: MilestonesStripProps) {
  const streakMs = Math.max(0, now - startedAt);
  const badges = milestoneBadges(startedAt, streakMs);
  const scrollRef = useRef<ScrollView>(null);
  const viewportWidth = useRef(0);
  const reached = badges.filter((b) => b.state === 'reached').length;
  const focus = focusIndex(badges);

  // Re-center the next badge whenever the streak changes (relapse, undo, quit-date
  // edit) or a milestone is reached — including scrolling back to the start.
  useEffect(() => {
    const width = viewportWidth.current;
    if (!width) return;
    scrollRef.current?.scrollTo({ x: stripScrollX(focus, width, ITEM_WIDTH, GAP, spacing.lg), animated: true });
  }, [startedAt, focus]);

  const onViewportLayout = (width: number) => {
    if (width === viewportWidth.current) return;
    viewportWidth.current = width;
    scrollRef.current?.scrollTo({ x: stripScrollX(focus, width, ITEM_WIDTH, GAP, spacing.lg), animated: false });
  };

  return (
    <View>
      <SectionHeader
        icon="flag-checkered"
        title="MILESTONES"
        right={
          <Text variant="captionStrong" tone="tertiary" tabular>
            {`${reached} / ${badges.length}`}
          </Text>
        }
      />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.scroll}
        onLayout={(e) => onViewportLayout(e.nativeEvent.layout.width)}
        testID="detail-milestones"
      >
        {badges.map((b) => (
          <MilestoneItem key={b.days} badge={b} color={color} streakMs={streakMs} now={now} habitId={habitId} />
        ))}
      </ScrollView>
    </View>
  );
}

interface MilestoneItemProps {
  badge: MilestoneBadge;
  color: string;
  streakMs: number;
  now: number;
  habitId: string;
}

function MilestoneItem({ badge, color, streakMs, now, habitId }: MilestoneItemProps) {
  const date = badgeDate(badge.at, now);
  const reached = badge.state === 'reached';
  const next = badge.state === 'next';
  const caption = next ? `in ${formatDurationShort(badge.days * DAY - streakMs)}` : date;
  const canOpen = reached && badge.certificate;
  const a11y = reached
    ? `${badge.label} milestone, reached ${date}${canOpen ? '. Opens certificate' : ''}`
    : next
      ? `${badge.label} milestone, next, ${Math.floor(badge.progress * 100)} percent`
      : `${badge.label} milestone, on ${date}`;

  const circle = reached ? (
    <View style={[styles.badge, { backgroundColor: color, boxShadow: `0 0 16px ${withAlpha(color, 0.45)}` }]}>
      <Text style={styles.short}>{badge.short}</Text>
      <View style={[styles.corner, { borderColor: colors.bg }, badge.certificate && { backgroundColor: colors.gold }]}>
        <Icon name={badge.certificate ? 'medal' : 'check-bold'} size={11} color={badge.certificate ? colors.textInverse : color} />
      </View>
    </View>
  ) : next ? (
    <View style={styles.badge}>
      <ArcRing progress={badge.progress} size={BADGE} strokeWidth={4} color={color} trackColor={withAlpha(color, 0.2)}>
        <Text style={styles.short} color={color}>
          {badge.short}
        </Text>
      </ArcRing>
    </View>
  ) : (
    <View style={[styles.badge, styles.future]}>
      <Text style={styles.short} tone="tertiary">
        {badge.short}
      </Text>
      {badge.certificate ? (
        <View style={[styles.corner, styles.cornerDim, { borderColor: colors.bg }]}>
          <Icon name="medal-outline" size={11} color={colors.textTertiary} />
        </View>
      ) : null}
    </View>
  );

  const body = (
    <>
      {circle}
      <Text variant="micro" tone={next ? undefined : 'tertiary'} color={next ? color : undefined} numberOfLines={1} style={styles.caption}>
        {caption}
      </Text>
    </>
  );

  if (!canOpen) {
    return (
      <View style={styles.item} accessible accessibilityLabel={a11y}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/certificate?habitId=${encodeURIComponent(habitId)}&days=${badge.days}`)}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      testID={`milestone-${badge.days}`}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -spacing.lg },
  row: { gap: GAP, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  item: { width: ITEM_WIDTH, alignItems: 'center', gap: 6 },
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: 'center', justifyContent: 'center' },
  future: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  short: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  corner: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerDim: { backgroundColor: colors.bgElevated },
  caption: { fontSize: 10, letterSpacing: 0.2 },
  pressed: { opacity: 0.7 },
});
