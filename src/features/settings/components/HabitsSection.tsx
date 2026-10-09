import { router } from 'expo-router';
import { useState } from 'react';

import { ListGroup, ListRow, SectionHeader } from '@/components';
import { useActiveHabits, useArchivedHabits } from '@/store/selectors';
import { colors } from '@/theme';
import { ReorderSheet } from './ReorderSheet';

export function HabitsSection() {
  const active = useActiveHabits();
  const archived = useArchivedHabits();
  const [reordering, setReordering] = useState(false);

  return (
    <>
      <SectionHeader title="Habits" icon="format-list-bulleted" />
      <ListGroup>
        <ListRow
          title="Reorder habits"
          subtitle={active.length > 1 ? 'Home screen order' : undefined}
          icon="swap-vertical"
          iconColor={colors.accent}
          value={active.length ? String(active.length) : undefined}
          onPress={() => setReordering(true)}
          testID="settings-reorder"
        />
        <ListRow
          title="Archived habits"
          icon="archive-outline"
          iconColor={colors.warning}
          value={String(archived.length)}
          onPress={() => router.push('/settings/archived')}
          testID="settings-archived"
        />
        <ListRow title="Add habit" icon="plus" iconColor={colors.success} onPress={() => router.push('/habit/new')} testID="settings-add-habit" />
      </ListGroup>
      {reordering ? <ReorderSheet onClose={() => setReordering(false)} /> : null}
    </>
  );
}
