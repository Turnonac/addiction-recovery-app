import { useState } from 'react';

import { ListGroup, ListRow, SectionHeader } from '@/components';
import { colors } from '@/theme';
import { appVersion } from '../appInfo';
import { AboutSheet } from './AboutSheet';
import { CrisisSheet } from './CrisisSheet';

export function SupportSection() {
  const [open, setOpen] = useState<'crisis' | 'about' | null>(null);
  return (
    <>
      <SectionHeader title="Support" icon="lifebuoy" />
      <ListGroup>
        <ListRow
          title="If you’re in crisis"
          subtitle="Helplines and immediate support"
          icon="hand-heart"
          iconColor={colors.pink}
          onPress={() => setOpen('crisis')}
          testID="settings-crisis"
        />
        <ListRow title="About" icon="information-outline" iconColor={colors.textSecondary} value={`v${appVersion()}`} onPress={() => setOpen('about')} testID="settings-about" />
      </ListGroup>
      {open === 'crisis' ? <CrisisSheet onClose={() => setOpen(null)} /> : null}
      {open === 'about' ? <AboutSheet onClose={() => setOpen(null)} /> : null}
    </>
  );
}
