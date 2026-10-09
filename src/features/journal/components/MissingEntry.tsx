import { router } from 'expo-router';

import { Header, Screen } from '@/components';
import { colors } from '@/theme';
import { backOr } from '../useJournalActions';
import { JournalEmpty } from './JournalEmpty';

/** Shown when /journal/[id] or /journal/new?id= points at an entry that no longer exists. */
export function MissingEntry({ left = 'back' }: { left?: 'back' | 'close' }) {
  const canGoBack = router.canGoBack();
  return (
    <Screen glowColor={colors.purple} glowIntensity={0.25} header={<Header left={left} onLeftPress={() => backOr('/journal')} />} testID="journal-missing">
      <JournalEmpty
        icon="notebook-remove-outline"
        title="Entry not found"
        message="This journal entry may have been deleted."
        actionLabel={canGoBack ? 'Go back' : 'Open journal'}
        onAction={() => backOr('/journal')}
      />
    </Screen>
  );
}
