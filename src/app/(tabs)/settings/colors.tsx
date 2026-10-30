import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { COLOR_LEVELS } from '@/domain/types';
import { BehaviorEditor } from '@/features/onboarding/BehaviorEditor';
import { useAppStore } from '@/state/store';
import { BackButton, Screen, ScreenHeader } from '@/ui/components';
import { useAppTheme } from '@/ui/theme';

/** Settings › My colors: the user's own behaviors under each fixed color. */
export default function ColorsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const partnerName = useAppStore((s) => s.settings.partner?.name ?? null);
  const who = partnerName && partnerName.trim() ? partnerName.trim() : 'your partner';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  return (
    <Screen>
      <BackButton label="Settings" onPress={goBack} />
      <ScreenHeader
        title="My colors"
        subtitle={`Write these yourself, or with ${who}. They show when you log your color. Tap one to edit it.`}
      />
      <BehaviorEditor levels={COLOR_LEVELS} />
      <Text style={{ marginHorizontal: 4, color: theme.muted, fontSize: 13, lineHeight: 18 }}>
        Changing your list doesn&apos;t change past days.
      </Text>
    </Screen>
  );
}
